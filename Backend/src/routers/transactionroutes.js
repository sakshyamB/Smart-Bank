import express from "express";
import { authMiddleware, authSystemUsermiddleware } from "../middleware/authmiddleware.js";
import { createTransaction,createInitialFundsTransaction } from "../controllers/transactioncontroller.js";

const transactionRouter = express.Router();

//- POST /api/transactions/ - create a new transaction
transactionRouter.post("/", authMiddleware, createTransaction)

// - POST /api/transactions/system/initial-funds - Create initial funds transaction from system user
transactionRouter.post("/system/initial-funds", authSystemUsermiddleware,createInitialFundsTransaction);

export default transactionRouter;