import { connectDB } from "../config/db.js";

export const createLedgerTable = async () => {
  try {
    const connection = await connectDB();
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS ledgers (
                id INT AUTO_INCREMENT PRIMARY KEY,

                account INT NOT NULL,
                transaction INT NOT NULL,

                amount DECIMAL(12,2) NOT NULL,
                type ENUM('CREDIT','DEBIT') NOT NULL,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                INDEX idx_account (account),
                INDEX idx_transaction (transaction),

                FOREIGN KEY (account) REFERENCES accounts(id) ON DELETE RESTRICT,
                FOREIGN KEY (transaction) REFERENCES transactions(id) ON DELETE RESTRICT
            )
            `);
    console.log(`Ledger Table created successfully`);
  } catch (error) {
    console.log(`Error to create a Ledger Table`, error);
    process.exit(1);
  }
};

await createLedgerTable();