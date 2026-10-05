import {  mysql_db } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {sendRegistrationEmail} from "../services/emailservice.js"

export const handleUserRegister = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if(!email.match(pattern)) {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    const [user] = await mysql_db.query("SELECT * FROM users WHERE email = ?", [email]);

    if(user.length > 0) {
      return res.status(400).json({
        sucess:false,
        message: "User already exists"
      })
    };

    const hashpassword = await bcrypt.hash(password, 10);

    const [result] = await mysql_db.query("INSERT INTO users (email, name, password) VALUES (?,?,?)", [email, name, hashpassword]);

    res.status(201).json({
      sucess: true,
      user: {
        id: result.insertId ,
        email: email,
        name: name
      }
    });

    await sendRegistrationEmail(email, name);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Register error",
      error: error.message,
    });
  }
};

export const handleUserLogin = async(req, res) => {
  try {
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const [user] = await mysql_db.query("SELECT * FROM users WHERE email = ?", [email]);

    if(user.length === 0) {
       return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const dbUser = user[0];
    const match = await bcrypt.compare(password, dbUser.password);

    if(!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = jwt.sign(
      {
        id : dbUser.id,
        name: dbUser.name,
        systemUser: dbUser.systemUser
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m"
      }
    );

    const refreshToken = jwt.sign(
      {
        id : dbUser.id,
        name: dbUser.name,
        systemUser: dbUser.systemUser
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 //7days
    });

      res.status(201).json({
      success: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
      },
      accessToken
    });
  } catch (error) {
      res.status(500).json({
      success: false,
      message: "Login error",
      error: error.message,
    });
  }
}

//- User Logout Controller
export const handleUserLogout = async(req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "User logged out successfully." });
  } catch (error) {
    console.error("Error inhandleUserLogout:", error);
        return res.status(500).json({
            message: "Logout failed.",
            error: error.message
        });
  }
}

export const handleUserInfo = async(req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if(!token) {
    return res.status(401).json({message: "No token provided"});
  }
  
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded.id;

    const [rows] = await mysql_db.query("SELECT * FROM users WHERE id = ?", [userId]);

    if (!rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = rows[0];
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    return res.status(401).json({
      message: "login Required"
    });
  }
}

export const handleUserRefreshToken = async(req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if(!oldRefreshToken) {
      return res.status(401).json({message: "Unauthorized access, token is missing"})
    }

    const decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userId = decoded.id;

    const [rows] = await mysql_db.query("SELECT id, name, systemUser FROM users WHERE id = ?", [userId]);

    if (!rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = rows[0];

    const accessToken = jwt.sign(
      {
        id : user.id,
        name: user.name,
        systemUser: user.systemUser
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m"
      }
    );

    const newRefreshToken = jwt.sign(
      {
        id : user.id,
        name: user.name,
        systemUser: user.systemUser
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 //7days
    })

    res.status(200).json({
      success: true,
      accessToken
    });
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized access, token is invalid"
    });
  }
}