exports.searchVideos = async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 10,
      sort = "relevance",
      dateRange,
      duration,
    } = req.query;
    const skip = (page - 1) * limit;

    let sortOption = { score: { $meta: "textScore" } };
    if (sort === "views") {
      sortOption = { viewCount: -1 };
    } else if (sort === "date") {
      sortOption = { publishedAt: -1 };
    }

    let query = { $text: { $search: q } };

    // 日付範囲フィルター
    if (dateRange) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(dateRange));
      query.publishedAt = { $gte: date };
    }

    // 動画の長さフィルター
    if (duration) {
      switch (duration) {
        case "short":
          query.duration = { $lt: "PT4M" };
          break;
        case "medium":
          query.duration = { $gte: "PT4M", $lte: "PT20M" };
          break;
        case "long":
          query.duration = { $gt: "PT20M" };
          break;
      }
    }

    const videos = await Video.find(query, { score: { $meta: "textScore" } })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .select("title thumbnail channelName viewCount publishedAt duration");

    const total = await Video.countDocuments(query);

    res.json({
      videos,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalVideos: total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getRelatedVideos = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const relatedVideos = await Video.find({
      $or: [{ genre: video.genre }, { tags: { $in: video.tags } }],
      _id: { $ne: video._id },
    })
      .limit(10)
      .select("title thumbnail channelName viewCount");

    res.json(relatedVideos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
