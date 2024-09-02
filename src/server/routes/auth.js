const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { loginLimiter } = require("../middleware/rateLimiter");
const { validateRequest } = require("../middleware/validator");

const isTestEnv = process.env.NODE_ENV === 'test';

// Public routes
router.post("/register", validateRequest({
  body: {
    type: "object",
    properties: {
      username: { type: "string", minLength: 3, maxLength: 30 },
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 12 },
      userType: { type: "string", enum: ["general", "creator", "admin"] }
    },
    required: ["username", "email", "password", "userType"]
  }
}), authController.register);

router.post("/login", isTestEnv ? authController.login : loginLimiter, validateRequest({
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
      twoFactorToken: { type: "string" }
    },
    required: ["email", "password"]
  }
}), authController.login);

router.get("/confirm-email/:token", authController.confirmEmail);

router.post("/forgot-password", validateRequest({
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" }
    },
    required: ["email"]
  }
}), authController.forgotPassword);

router.put("/reset-password/:resetToken", validateRequest({
  body: {
    type: "object",
    properties: {
      password: { type: "string", minLength: 12 }
    },
    required: ["password"]
  }
}), authController.resetPassword);

router.post("/recover-account", validateRequest({
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" }
    },
    required: ["email"]
  }
}), authController.recoverAccount);

// Protected routes
router.use(protect);

router.get("/profile", authController.getProfile);
router.post("/logout", authController.logout);

router.put("/change-password", validateRequest({
  body: {
    type: "object",
    properties: {
      currentPassword: { type: "string", minLength: 12 },
      newPassword: { type: "string", minLength: 12 }
    },
    required: ["currentPassword", "newPassword"]
  }
}), authController.changePassword);

router.put("/update-profile", validateRequest({
  body: {
    type: "object",
    properties: {
      firstName: { type: "string", maxLength: 50 },
      lastName: { type: "string", maxLength: 50 },
      bio: { type: "string", maxLength: 500 },
      avatar: { type: "string" }
    }
  }
}), authController.updateProfile);

router.delete("/delete-account", authController.deleteAccount);

router.post("/enable-2fa", authController.enable2FA);
router.post("/disable-2fa", authController.disable2FA);
router.get("/recovery-codes", authController.getRecoveryCodes);
router.post("/regenerate-recovery-codes", authController.regenerateRecoveryCodes);

router.get("/login-history", authController.getLoginHistory);
router.get("/active-sessions", authController.getActiveSessions);
router.delete("/revoke-session/:sessionId", authController.revokeSession);

router.post("/request-data-export", authController.requestDataExport);

// Admin only route (example)
router.get("/admin", authorize('admin'), (req, res) => {
  res.json({ message: "Admin access granted" });
});

module.exports = router;