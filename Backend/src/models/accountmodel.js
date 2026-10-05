import { connectDB } from "../config/db.js";

export const createAccountTable = async () => {
  try {
    const connection = await connectDB();
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                status ENUM('ACTIVE','FROZEN','CLOSED') DEFAULT 'ACTIVE',
                currency VARCHAR(10) NOT NULL DEFAULT 'NRS',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                INDEX idx_user_id (user_id),
                
                INDEX idx_user_status (user_id, status),

                FOREIGN KEY (user_id) 
                REFERENCES users(id)
                ON DELETE CASCADE
            )
            `);
    console.log(`Account Table created successfully`);
  } catch (error) {
    console.log(`Error to create a Account Table`, error);
    process.exit(1);
  }
};

await createAccountTable();
