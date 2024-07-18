const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const auth = require('../middleware/auth');

// 特定のパスを持つルートを先に配置
router.get('/popular', videoController.getPopularVideos);
router.get('/search', videoController.searchVideos);
router.post('/search-and-save', auth, videoController.searchAndSaveVideos);

// パラメータを含むルートはその後に配置
router.get('/genre/:genreId', videoController.getVideosByGenre);
router.get('/:id', videoController.getVideoById);

// その他の一般的なルート
router.get('/', videoController.getVideos);
router.post('/', auth, videoController.addVideo);
router.put('/:id', auth, videoController.updateVideo);
router.delete('/:id', auth, videoController.deleteVideo);

module.exports = router;