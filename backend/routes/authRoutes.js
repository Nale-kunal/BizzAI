import express from "express";
import { registerUser, loginUser, getProfile, forgotPassword, resetPassword, forceLogout } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authLimiter, passwordResetLimiter, forceLogoutLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Public routes with rate limiting
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/force-logout", forceLogoutLimiter, forceLogout);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);

// Protected routes
router.get("/profile", protect, getProfile);

export default router;
