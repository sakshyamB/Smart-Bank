import mysql from "mysql2/promise";
import dotenv from "dotenv"

dotenv.config();

export const mysql_db = await mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

export const connectDB = async () => {
  try {
    await mysql_db.getConnection();
    console.log("Database connected");
    return mysql_db;
  } catch (error) {
    console.error("Error in DB", error);
    process.exit(1);
  }
};
