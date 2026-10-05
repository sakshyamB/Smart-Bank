import dotenv from "dotenv";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

dotenv.config();

const startServer = async () => {
  try {
    await connectDB();

    app.listen(4000, () => {
      console.log("Server is listening on port 4000");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();