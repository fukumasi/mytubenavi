const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const { validateRequest } = require("../middleware/validator");
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// プロフィール関連のルート
router.get("/profile", auth, userController.getProfile);
router.put("/profile", auth, validateRequest({
  body: {
    type: "object",
    properties: {
      username: { type: "string", nullable: true },
      firstName: { type: "string", nullable: true },
      lastName: { type: "string", nullable: true },
      bio: { type: "string", nullable: true },
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
}), userController.updateProfile);

// アバターアップロード
router.post("/avatar", auth, upload.single('avatar'), userController.uploadAvatar);

// メールアドレス変更
router.put("/change-email", auth, validateRequest({
  body: {
    type: "object",
    properties: {
      newEmail: { type: "string", format: "email" }
    },
    required: ["newEmail"]
  }
}), userController.changeEmail);

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
}), userController.changePassword);

module.exports = router;
