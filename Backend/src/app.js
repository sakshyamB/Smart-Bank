import express from "express";
import cookieParser from "cookie-parser";
import accountRouter from "./routers/accountroute.js";
import transactionRouter from "./routers/transactionroutes.js";
import authRouter from "./routers/userroute.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);

export default app;