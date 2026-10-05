import { mysql_db } from "../config/db.js";
import {getAccountBalanceService} from "../services/accountservice.js"
import {sendTransactionEmail} from "../services/emailservice.js"

export const createTransaction = async (req, res) => {
    const {fromAccount, toAccount, amount, idempotencykey} = req.body;

    if(!fromAccount || !toAccount || !amount || !idempotencykey) {
        return res.status(400).json({
            message: "All field required"
        })
    }

    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0"
        });
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({
            message: "Cannot transfer to the same account"
        });
    }

    let connection;

    try {
        connection = await mysql_db.getConnection();

        await connection.beginTransaction();

        const [fromRows] = await connection.query("SELECT * FROM accounts WHERE id = ? FOR UPDATE", [fromAccount]);

        const [toRows] = await connection.query("SELECT * FROM accounts WHERE id = ? FOR UPDATE", [toAccount]);

        if(fromRows.length === 0 || toRows.length ===0) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            return res.status(400).json({
                message: "Invalid fromAccount or toAccount"
            })
        }
    
        const fromAccountData = fromRows[0];
        const toAccountData = toRows[0];

        const [existingTx] = await connection.query("SELECT * FROM transactions WHERE idempotency_key = ?", [idempotencykey]);


        if(existingTx.length > 0) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }

            const tx = existingTx[0];

                if(tx.status === "COMPLETED"){
                    return res.status(200).json({
                        message: "Transaction already processed",
                        transaction: tx
                    })
                }

                if(tx.status === "PENDING") {
                    return res.status(202).json({
                        message: "Transaction is still processing",
                        transaction: tx
                    })
                }

                if(tx.status === "FAILED") {
                    return res.status(422).json({
                        message: "Transaction processing failed, please retry",
                        transaction: tx
                     })
                }

                if(tx.status === "REVERSED") {
                    return res.status(422).json({
                        message: "Transaction was reversed, please retry",
                        transaction: tx
                    })
                }   
             return res.status(409).json({ message: "Duplicate idempotency key.", transaction: tx });   
        }

        if (fromAccountData.status !== "ACTIVE") {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            return res.status(400).json({ message: "Sender account is not ACTIVE." });
        }

        if (toAccountData.status !== "ACTIVE") {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            return res.status(400).json({ message: "Recipient account is not ACTIVE." });
        }

        const balance = await getAccountBalanceService(fromAccount, connection);

        if(balance < amount) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
            })
        }

        const [txResult] = await connection.query(
            `INSERT INTO transactions (from_account, to_account, amount, idempotency_key, status)
            VALUES (?, ?, ?, ?, 'PENDING')`,
            [fromAccount, toAccount, amount, idempotencykey]
        );

        const transactionId = txResult.insertId;

        await connection.query(
            `INSERT INTO ledgers (account, transaction, amount, type)
            VALUES (?, ?, ?, 'DEBIT')`,
            [fromAccount, transactionId, amount]
        );

        await connection.query(
            `INSERT INTO ledgers (account, transaction, amount, type)
            VALUES (?, ?, ?, 'CREDIT')`,
            [toAccount, transactionId, amount]
        );

        await connection.query(
            `UPDATE transactions SET status='COMPLETED' WHERE id=?`,
            [transactionId]
        );

        await connection.commit();
        connection.release();

        try {
            await sendTransactionEmail(
                req.user.email,
                req.user.name,
                amount,
                toAccount
            );
        } catch (emailError) {
            console.error(`[Transaction ${transactionId}] Email notification failed:`, emailError.message);
        }

        return res.status(201).json({
            message: "Transaction completed successfully",
            transactionId
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
            connection.release();
        }

        console.error("[createTransaction] Unexpected error:", error);

        return res.status(500).json({
            message: "Transaction failed",
            error: error.message
        });
    }
}

export const createInitialFundsTransaction = async (req, res) => {
    const { toAccount, amount, idempotencykey} = req.body;

    if(!toAccount || !amount || !idempotencykey) {
        return res.status(400).json({
            message: "All field required"
        })
    }

    let connection;

    try {
        connection = await mysql_db.getConnection();
        await connection.beginTransaction();

        const [toRows] = await connection.query("SELECT * FROM accounts WHERE id = ? FOR UPDATE", [toAccount]);

        if(toRows.length === 0 ) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            return res.status(400).json({
                message: "Invalid toAccount"
            })
        }

        const [fromRows] = await connection.query("SELECT * FROM accounts WHERE id = ? FOR UPDATE", [req.user.account_id]); //req.user.id from middleware

        if(fromRows.length === 0) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            return res.status(400).json({
                message: "System user account not found"
            })
        }
        
        // Idempotency check
        const [existingTx] = await connection.query(
            "SELECT * FROM transactions WHERE idempotency_key = ?",
            [idempotencykey]
        );

        if (existingTx.length > 0) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            return res.status(409).json({ message: "Duplicate idempotency key." });
        }

        const [txResult] = await connection.query(
            `INSERT INTO transactions (from_account, to_account, amount, idempotency_key, status)
             VALUES (?, ?, ?, ?, 'PENDING')`,
            [req.user.account_id, toAccount, amount, idempotencykey]
        );

        const transactionId = txResult.insertId;

        await connection.query(
            `INSERT INTO ledgers (account, transaction, amount, type)
             VALUES (?, ?, ?, 'DEBIT')`,
            [req.user.account_id, transactionId, amount]
        );

        await connection.query(
            `INSERT INTO ledgers (account, transaction, amount, type)
             VALUES (?, ?, ?, 'CREDIT')`,
            [toAccount, transactionId, amount]
        );

        await connection.query(
            "UPDATE transactions SET status = 'COMPLETED' WHERE id = ?",
            [transactionId]
        );

        await connection.commit();
        connection.release();

        return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transactionId
    })
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }

        console.error("[createInitialFundsTransaction] Error:", error);
        return res.status(500).json({
            message: "Transaction failed.",
            error: error.message,
        });
    }
}