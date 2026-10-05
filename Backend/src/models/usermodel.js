import { connectDB } from "../config/db.js";

export const createUserTable = async () => {
  try {
    const connection = await connectDB();
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS users(
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL ,
                systemUser BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK (CHAR_LENGTH(password) >= 6)
            )
            `);
            
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'systemUser'
      AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN systemUser BOOLEAN DEFAULT FALSE
      `);
      console.log("systemUser column added");
    }
    console.log(`User Table created successfully`);
  } catch (error) {
    console.log(`Error to create a User Table`, error);
    process.exit(1);
  }
};

await createUserTable();
