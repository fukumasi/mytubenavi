const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

// コメントを作成 (認証必要)
router.post('/', auth, commentController.createComment);

// 特定の動画のコメントを取得
router.get('/video/:videoId', commentController.getVideoComments);

// コメントを更新 (認証必要)
router.put('/:id', auth, commentController.updateComment);

// コメントを削除 (認証必要)
router.delete('/:id', auth, commentController.deleteComment);

module.exports = router;
