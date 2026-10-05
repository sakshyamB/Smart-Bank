import express from "express";
import { handleUserLogin, handleUserRegister,handleUserLogout, handleUserInfo, handleUserRefreshToken } from "../controllers/usercontroller.js";

const authRouter = express.Router();

//- POST /api/auth/register 
authRouter.post("/register", handleUserRegister);

//- POST /api/auth/login 
authRouter.post("/login", handleUserLogin);

//- POST /api/auth/logout 
authRouter.post("/logout", handleUserLogout);

//- GET /api/auth/me
authRouter.get("/me", handleUserInfo);

//- POST /api/auth/refresh-token
authRouter.post("/refresh-token", handleUserRefreshToken);

export default authRouter;
