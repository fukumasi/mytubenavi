const FeaturedVideo = require("../models/FeaturedVideo");

exports.getFeaturedVideos = async (req, res) => {
  console.log("Fetching featured videos from database");
  try {
    const featuredVideos = await FeaturedVideo.find().populate(
      "user",
      "username channelName",
    );
    console.log(
      "Found featured videos:",
      JSON.stringify(featuredVideos, null, 2),
    );
    console.log("Number of featured videos:", featuredVideos.length);
    res.json(featuredVideos);
  } catch (error) {
    console.error("Error fetching featured videos:", error);
    res.status(500).json({ message: "サーバーエラーが発生しました" });
  }
};

exports.addFeaturedVideo = async (req, res) => {
  console.log("Adding new featured video");
  try {
    const newFeaturedVideo = new FeaturedVideo(req.body);
    await newFeaturedVideo.save();
    console.log(
      "New featured video added:",
      JSON.stringify(newFeaturedVideo, null, 2),
    );
    res.status(201).json(newFeaturedVideo);
  } catch (error) {
    console.error("Error adding featured video:", error);
    res.status(400).json({ message: "フィーチャード動画の追加に失敗しました" });
  }
};
