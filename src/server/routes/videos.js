const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const auth = require("../middleware/auth");

// 以下のルート定義は変更なし
router.get("/popular", videoController.getPopularVideos);
router.get("/search", videoController.searchVideos);
router.post("/search-and-save", auth, videoController.searchAndSaveVideos);

router.get("/genre/:genreId", videoController.getVideosByGenre);
router.get("/:id", videoController.getVideoById);

router.get("/", videoController.getVideos);
router.post("/", auth, videoController.addVideo);
router.put("/:id", auth, videoController.updateVideo);
router.delete("/:id", auth, videoController.deleteVideo);

router.get("/:id/related", videoController.getRelatedVideos);

module.exports = router;
