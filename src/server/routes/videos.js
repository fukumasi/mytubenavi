const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const auth = require("../middleware/auth");

// 検索関連のルート
router.get("/search", videoController.searchVideos);
router.post("/search-and-save", auth, videoController.searchAndSaveVideos);

// 動画取得関連のルート
router.get("/popular", videoController.getPopularVideos);
router.get("/genre/:genreId", videoController.getVideosByGenre);
router.get("/", videoController.getVideos);

// 特定の動画に関するルート
router.get("/:id", videoController.getVideoDetails);
router.get("/:id/related", videoController.getRelatedVideos);

// 動画の追加、更新、削除（認証が必要）
router.post("/", auth, videoController.addVideo);
router.put("/:id", auth, videoController.updateVideo);
router.delete("/:id", auth, videoController.deleteVideo);

// 新しく追加されたルート
router.post('/:id/view', videoController.incrementViewCount);
router.post('/:id/comment', auth, videoController.addComment);

module.exports = router;