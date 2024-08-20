/**
 * 注意: このファイルは非推奨となり、将来的に削除される予定です。
 * 新しいユーザー関連のルートは src/server/routes/userRoutes.js に
 * 追加してください。このファイルは後方互換性のために維持されています。
 * 
 * @deprecated 新しいルートの追加には userRoutes.js を使用してください。
 */

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");

// プロフィール関連のルート
router.get("/profile", auth, (req, res, next) => {
  if (typeof userController.getProfile === 'function') {
    userController.getProfile(req, res, next);
  } else {
    res.status(501).json({ message: "Not implemented" });
  }
});

router.put("/profile", auth, validateRequest({
  body: {
    type: "object",
    properties: {
      username: { type: "string", nullable: true },
      firstName: { type: "string", nullable: true },
      lastName: { type: "string", nullable: true },
      bio: { type: "string", nullable: true },
      avatar: { type: "string", nullable: true },
      preferences: { 
        type: "object", 
        properties: {
          theme: { type: "string", nullable: true },
          language: { type: "string", nullable: true },
          notifications: { type: "boolean", nullable: true }
        },
        nullable: true 
      },
      socialLinks: { 
        type: "object", 
        properties: {
          twitter: { type: "string", nullable: true },
          instagram: { type: "string", nullable: true },
          youtube: { type: "string", nullable: true }
        },
        nullable: true 
      }
    },
    required: []
  }
}), (req, res, next) => {
  if (typeof userController.updateProfile === 'function') {
    userController.updateProfile(req, res, next);
  } else {
    res.status(501).json({ message: "Not implemented" });
  }
});

// メールアドレス変更
router.put("/change-email", auth, validateRequest({
  body: {
    type: "object",
    properties: {
      newEmail: { type: "string", format: "email" }
    },
    required: ["newEmail"]
  }
}), (req, res, next) => {
  if (typeof userController.changeEmail === 'function') {
    userController.changeEmail(req, res, next);
  } else {
    res.status(501).json({ message: "Not implemented" });
  }
});

// パスワード変更
router.put("/change-password", auth, validateRequest({
  body: {
    type: "object",
    properties: {
      currentPassword: { type: "string", minLength: 8 },
      newPassword: { type: "string", minLength: 8 }
    },
    required: ["currentPassword", "newPassword"]
  }
}), (req, res, next) => {
  if (typeof userController.changePassword === 'function') {
    userController.changePassword(req, res, next);
  } else {
    res.status(501).json({ message: "Not implemented" });
  }
});

module.exports = router;