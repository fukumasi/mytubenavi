const Video = require("../models/Video");

exports.searchVideos = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const videos = await Video.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(20)
      .select("title thumbnail channelName views");

    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
