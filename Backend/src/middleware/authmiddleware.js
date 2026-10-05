import { mysql_db } from "../config/db.js";
import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if(!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.id;

        const [rows] = await mysql_db.query("SELECT * FROM users WHERE id = ?", [userId]);

        if (!rows.length) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = rows[0];

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        });
    }
};  

export const authSystemUsermiddleware = async(req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if(!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (!decoded.systemUser) {
            return res.status(403).json({ message: "Forbidden, system user access only" });
        }
        
        const [rows] = await mysql_db.query(
            `SELECT u.*, a.id as account_id 
             FROM users u
             JOIN accounts a ON a.user_id = u.id
             WHERE u.id = ? AND u.systemUser = 1`,
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                message: "Forbidden, system user access only"
            });
        }

        req.user = rows[0];

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        });
    }
};