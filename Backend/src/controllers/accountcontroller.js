import { mysql_db } from "../config/db.js";
import {getAccountBalanceService} from "../services/accountservice.js"

export const handleCreateAccount = async (req, res) => {
    const user = req.user;

    try {
        const [result] = await mysql_db.query("INSERT INTO accounts (user_id) VALUES (?)", [user.id]);
        const [rows] = await mysql_db.query("SELECT * FROM accounts WHERE id = ?", [result.insertId]);

        res.status(201).json({
            account: rows[0]
        })
    } catch (error) {
        console.error("Error in handleCreateAccount:", error);
        return res.status(500).json({ message: error.message });
    }
}

export const getuserAccounts = async(req, res) => {
    try {
        const [accounts]  = await mysql_db.query("SELECT * FROM accounts WHERE user_id =?", [req.user.id]);
        res.status(200).json({
            accounts
        });
    } catch (error) {
        console.error("Error in getUserAccounts:", error);
        return res.status(500).json({
            message: "Failed to fetch accounts.",
            error: error.message
        });
    }
}   

export const getAccountBalance = async(req, res) => {
    try {
        const {accountId} = req.params;

        const [accounts] = await mysql_db.query("SELECT * FROM accounts WHERE id = ? AND user_id =?", [accountId, req.user.id]);

        if (accounts.length === 0) {
            return res.status(404).json({ message: "Account not found." });
        }

        const balance = await getAccountBalanceService(accountId);

         return res.status(200).json({
            accountId: accounts[0].id,  
            balance
        });
    } catch (error) {
        console.error("Error in getAccountBalance:", error);
        return res.status(500).json({
            message: "Failed to fetch balance.",
            error: error.message
        });
    }
};