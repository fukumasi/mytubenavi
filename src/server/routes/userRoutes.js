const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
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

// すべてのルートに認証を適用
router.use(protect);

// プロフィール関連のルート
router.get("/profile", userController.getProfile);

router.put("/profile", validateRequest({
  body: {
    type: "object",
    properties: {
      username: { type: "string", nullable: true, minLength: 3, maxLength: 30 },
      firstName: { type: "string", nullable: true, maxLength: 50 },
      lastName: { type: "string", nullable: true, maxLength: 50 },
      bio: { type: "string", nullable: true, maxLength: 500 },
      preferences: { 
        type: "object", 
        properties: {
          theme: { type: "string", enum: ["light", "dark"], nullable: true },
          language: { type: "string", nullable: true },
          notifications: { type: "boolean", nullable: true }
        },
        nullable: true 
      },
      socialLinks: { 
        type: "object", 
        properties: {
          twitter: { type: "string", nullable: true, format: "uri" },
          instagram: { type: "string", nullable: true, format: "uri" },
          youtube: { type: "string", nullable: true, format: "uri" }
        },
        nullable: true 
      }
    },
    required: []
  }
}), userController.updateProfile);

// アバターアップロード
router.post("/avatar", upload.single('avatar'), userController.uploadAvatar);

// メールアドレス変更
router.put("/change-email", validateRequest({
  body: {
    type: "object",
    properties: {
      newEmail: { type: "string", format: "email" }
    },
    required: ["newEmail"]
  }
}), userController.changeEmail);

// ユーザーの視聴履歴取得
router.get("/watch-history", userController.getWatchHistory);

// ユーザーのお気に入り動画取得
router.get("/favorites", userController.getFavorites);

// ユーザーの購読チャンネル取得
router.get("/subscriptions", userController.getSubscriptions);

module.exports = router;