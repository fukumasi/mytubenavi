const express = require('express');
const adVideoController = require('../controllers/adVideoController');
const authController = require('../controllers/authController');

const router = express.Router();

// 認証が必要なルートを保護
router.use(authController.protect);

// 広告動画の作成
router.post('/', adVideoController.addAdVideo);

// ユーザーの広告動画一覧を取得
router.get('/my-ads', adVideoController.getAdVideos);

// 特定の広告動画を取得
router.get('/:id', adVideoController.getAdVideo);

// 広告動画を更新
router.patch('/:id', adVideoController.updateAdVideo);

// 広告動画を削除
router.delete('/:id', adVideoController.deleteAdVideo);

// アクティブな広告動画を取得（認証不要）
router.get('/active', authController.removeProtect, adVideoController.getActiveAdVideo);

// 表示回数をインクリメント（認証不要）
router.post('/:id/view', authController.removeProtect, adVideoController.incrementViewCount);

// クリック数をインクリメント（認証不要）
router.post('/:id/click', authController.removeProtect, adVideoController.incrementClickCount);

module.exports = router;