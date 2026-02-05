import express from "express";
import { registerUser, loginUser, getProfile, forgotPassword, resetPassword, forceLogout } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authLimiter, passwordResetLimiter, forceLogoutLimiter } from "../middlewares/rateLimiter.js";
import { getCsrfToken } from "../middlewares/csrfMiddleware.js";

const router = express.Router();

// Public routes with rate limiting
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/force-logout", forceLogoutLimiter, forceLogout);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);

// Protected routes
router.get("/profile", protect, getProfile);
router.get("/me", protect, getProfile); // Alias for /profile to match test expectations
router.post("/logout", protect, (req, res) => {
    // Simple logout - client should discard token
    res.status(200).json({ success: true, message: "Logged out successfully" });
});
router.get("/csrf-token", protect, getCsrfToken); // CSRF token endpoint

export default router;
