import express from "express";
import crypto from "crypto";
import User from "../model/usermodel.js";
import { sendOtpEmail } from "../utils/emailService.js";

const userrouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "freshroot_super_secure_secret_2026";
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper to generate HMAC signed session token
export const generateToken = (user) => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    userId: user._id || user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + TOKEN_EXPIRY_MS
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
};

// Helper to verify HMAC signed session token
export const verifyToken = (token) => {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (decoded.exp && Date.now() > decoded.exp) return null;
    return decoded;
  } catch (e) {
    return null;
  }
};

// POST /api/auth/register
userrouter.post("/register", async (req, res) => {
  try {
    const { name, fullName, email, password } = req.body;
    const userName = (name || fullName || "").trim();
    const userEmail = (email || "").toLowerCase().trim();

    if (!userName || !userEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide full name, email, and password."
      });
    }

    const existingUser = await User.findOne({ email: userEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in."
      });
    }

    const newUser = new User({
      name: userName,
      email: userEmail,
      password: password
    });

    await newUser.save();

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to FreshRoot.",
      token,
      expiresAt: Date.now() + TOKEN_EXPIRY_MS,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again later.",
      error: error.message
    });
  }
});

// POST /api/auth/login
userrouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userEmail = (email || "").toLowerCase().trim();

    if (!userEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password."
      });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with this email. Please create an account."
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again or reset your password."
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      expiresAt: Date.now() + TOKEN_EXPIRY_MS,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login. Please try again later.",
      error: error.message
    });
  }
});

// GET /api/auth/verify - Validate session token & return active user
userrouter.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Authentication session has expired or is invalid. Please log in again."
      });
    }

    const user = await User.findById(decoded.userId).select("-password -resetOtp -resetOtpExpires");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found. Please log in again."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Session is valid.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify authentication session.",
      error: error.message
    });
  }
});

// POST /api/auth/forgot-password (Send OTP to registered mail)
userrouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const userEmail = (email || "").toLowerCase().trim();

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "Please enter your registered email address."
      });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address."
      });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    user.resetOtp = otp;
    user.resetOtpExpires = otpExpires;
    await user.save();

    // Send email with OTP
    await sendOtpEmail(user.email, otp, user.name);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${user.email}. Please check your inbox or spam folder.`,
      email: user.email
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request. Please try again.",
      error: error.message
    });
  }
});

// POST /api/auth/verify-otp (Verify OTP)
userrouter.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const userEmail = (email || "").toLowerCase().trim();
    const userOtp = (otp || "").toString().trim();

    if (!userEmail || !userOtp) {
      return res.status(400).json({
        success: false,
        message: "Email address and 6-digit OTP are required."
      });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (!user.resetOtp || user.resetOtp !== userOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please check and try again."
      });
    }

    if (!user.resetOtpExpires || new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code verified successfully. You may now set a new password."
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying code.",
      error: error.message
    });
  }
});

// POST /api/auth/reset-password (Set new password)
userrouter.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const userEmail = (email || "").toLowerCase().trim();
    const userOtp = (otp || "").toString().trim();

    if (!userEmail || !userOtp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, verification code, and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long."
      });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (!user.resetOtp || user.resetOtp !== userOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please request a new code."
      });
    }

    if (!user.resetOtpExpires || new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one."
      });
    }

    // Update password & clear OTP fields
    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password. Please try again later.",
      error: error.message
    });
  }
});

export default userrouter;
