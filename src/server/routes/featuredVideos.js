const express = require("express");
const router = express.Router();
const featuredVideoController = require("../controllers/featuredVideoController");

// GET route for fetching featured videos
router.get("/", featuredVideoController.getFeaturedVideos);

// POST route for adding a new featured video (auth middleware removed for now)
router.post("/", featuredVideoController.addFeaturedVideo);

module.exports = router;
