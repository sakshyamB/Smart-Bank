import { connectDB } from "../config/db.js";

export const createTransactionTable = async () => {
  try {
    const connection = await connectDB();
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,

                from_account INT NOT NULL,
                to_account INT NOT NULL,

                status ENUM('PENDING','COMPLETED','FAILED','REVERSED') DEFAULT 'PENDING',
                amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),

                idempotency_key VARCHAR(255) NOT NULL UNIQUE,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
                    ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_from_account (from_account),
                INDEX idx_to_account (to_account),
                INDEX idx_idempotency_key (idempotency_key),

                
                FOREIGN KEY (from_account) REFERENCES accounts(id) ON DELETE RESTRICT,
                FOREIGN KEY (to_account) REFERENCES accounts(id) ON DELETE RESTRICT
            )
            `);
    console.log(`transactions Table created successfully`);
  } catch (error) {
    console.log(`Error to create a transactions Table`, error);
    process.exit(1);
  }
};

await createTransactionTable();