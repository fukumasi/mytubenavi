const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const loginLimiter = require("../middleware/rateLimiter");

const isTestEnv = process.env.NODE_ENV === 'test';

// Public routes
router.post("/register", authController.register);
router.post("/login", isTestEnv ? authController.login : loginLimiter, authController.login);  // テスト環境でレートリミッターを無効化
router.get("/confirm-email/:token", authController.confirmEmail);
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password/:resetToken", authController.resetPassword);

// Protected routes
router.get("/profile", protect, authController.getProfile);
router.post("/logout", protect, authController.logout);

// Admin only route (example)
router.get("/admin", protect, authorize('admin'), (req, res) => {
  res.json({ message: "Admin access granted" });
});

module.exports = router;
