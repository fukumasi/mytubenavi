const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const loginLimiter = require("../middleware/rateLimiter");

router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);
router.get("/confirm-email/:token", authController.confirmEmail);
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password/:resetToken", authController.resetPassword);
router.get("/profile", protect, authController.getProfile);

module.exports = router;
