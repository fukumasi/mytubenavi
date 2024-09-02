const Video = require("../models/Video");

exports.searchVideos = async (req, res) => {
  try {
    const { q, category, duration, uploadDate, sortBy, sortDirection = 'descending', page = 1, limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // 基本的な検索クエリ
    let query = { $text: { $search: q } };

    // カテゴリフィルター
    if (category) {
      query.category = category;
    }

    // 動画の長さフィルター
    if (duration) {
      switch (duration) {
        case 'short':
          query.duration = { $lte: 240 }; // 4分以下
          break;
        case 'medium':
          query.duration = { $gt: 240, $lte: 1200 }; // 4〜20分
          break;
        case 'long':
          query.duration = { $gt: 1200 }; // 20分以上
          break;
      }
    }

    // アップロード日フィルター
    if (uploadDate) {
      const now = new Date();
      let dateLimit;
      switch (uploadDate) {
        case 'hour':
          dateLimit = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          dateLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateLimit = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          dateLimit = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      if (dateLimit) {
        query.uploadDate = { $gte: dateLimit };
      }
    }

    // ソートオプション
    let sortOption = { score: { $meta: "textScore" } };
    if (sortBy) {
      const sortMultiplier = sortDirection === 'ascending' ? 1 : -1;
      switch (sortBy) {
        case 'date':
          sortOption = { uploadDate: sortMultiplier };
          break;
        case 'viewCount':
          sortOption = { views: sortMultiplier };
          break;
        case 'rating':
          sortOption = { rating: sortMultiplier };
          break;
        case 'duration':
          sortOption = { duration: sortMultiplier };
          break;
        case 'category':
          sortOption = { category: sortMultiplier };
          break;
        // 'relevance' はデフォルトのテキストスコアソートを使用
      }
    }

    const skip = (page - 1) * limit;

    const videos = await Video.find(query, { score: { $meta: "textScore" } })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .select("title thumbnail channelName views uploadDate duration category rating");

    const totalVideos = await Video.countDocuments(query);

    res.json({
      videos,
      currentPage: page,
      totalPages: Math.ceil(totalVideos / limit),
      totalVideos
    });
  } catch (err) {
    console.error("Search error:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid query parameter" });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "An error occurred while searching for videos" });
  }
};