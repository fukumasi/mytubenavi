const express = require("express");
const router = express.Router();
const featuredVideoController = require("../controllers/featuredVideoController");

router.get("/", featuredVideoController.getFeaturedVideos);
router.get("/paginated", featuredVideoController.getFeaturedVideosPaginated);
router.post("/", featuredVideoController.addFeaturedVideo);
router.get("/cache-stats", featuredVideoController.getCacheStats);
router.post("/refresh-cache", featuredVideoController.refreshCache);

module.exports = router;