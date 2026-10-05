import { mysql_db } from "../config/db.js";

export async function getAccountBalanceService(accountId, conn = null) {
    const db = conn ?? mysql_db;

    const [rows] = await db.query(
        `SELECT
            COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type = 'DEBIT'  THEN amount ELSE 0 END), 0) AS balance
         FROM ledgers
         WHERE account = ?`,
        [accountId]
    );

    return Number(rows[0]?.balance) || 0;
}
