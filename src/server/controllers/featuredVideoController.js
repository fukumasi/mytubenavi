const FeaturedVideo = require("../models/FeaturedVideo");
const { getCacheStats } = require("../services/youtubeService");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10分のキャッシュ、2分ごとにチェック

exports.getFeaturedVideos = async (req, res) => {
  console.log("Fetching featured videos");
  const cacheKey = 'featured_videos';
  
  try {
    // キャッシュをチェック
    const cachedVideos = cache.get(cacheKey);
    if (cachedVideos) {
      console.log("Returning cached featured videos");
      return res.json(cachedVideos);
    }

    // データベースから取得
    const featuredVideos = await FeaturedVideo.find()
      .populate("user", "username channelName")
      .lean()
      .limit(20); // 最大20件に制限

    console.log(`Found ${featuredVideos.length} featured videos`);

    // キャッシュに保存
    cache.set(cacheKey, featuredVideos);

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
    console.log("New featured video added:", newFeaturedVideo._id);

    // キャッシュを更新
    cache.del('featured_videos');

    res.status(201).json(newFeaturedVideo);
  } catch (error) {
    console.error("Error adding featured video:", error);
    res.status(400).json({ message: "フィーチャード動画の追加に失敗しました" });
  }
};

// キャッシュの統計情報を取得するエンドポイント
exports.getCacheStats = (req, res) => {
  const stats = getCacheStats();
  res.json(stats);
};

// ページネーション機能を追加
exports.getFeaturedVideosPaginated = async (req, res) => {
  console.log("Fetching paginated featured videos");
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const cacheKey = `featured_videos_page_${page}_limit_${limit}`;

  try {
    // キャッシュをチェック
    const cachedVideos = cache.get(cacheKey);
    if (cachedVideos) {
      console.log("Returning cached paginated featured videos");
      return res.json(cachedVideos);
    }

    const skip = (page - 1) * limit;

    const [featuredVideos, total] = await Promise.all([
      FeaturedVideo.find()
        .populate("user", "username channelName")
        .lean()
        .skip(skip)
        .limit(limit),
      FeaturedVideo.countDocuments()
    ]);

    const result = {
      videos: featuredVideos,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalVideos: total
    };

    console.log(`Found ${featuredVideos.length} featured videos for page ${page}`);

    // キャッシュに保存
    cache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error("Error fetching paginated featured videos:", error);
    res.status(500).json({ message: "サーバーエラーが発生しました" });
  }
};

// キャッシュを手動で更新するエンドポイント
exports.refreshCache = async (req, res) => {
  console.log("Manually refreshing featured videos cache");
  try {
    const featuredVideos = await FeaturedVideo.find()
      .populate("user", "username channelName")
      .lean()
      .limit(20);

    cache.set('featured_videos', featuredVideos);
    console.log("Cache refreshed successfully");
    res.json({ message: "キャッシュが正常に更新されました" });
  } catch (error) {
    console.error("Error refreshing cache:", error);
    res.status(500).json({ message: "キャッシュの更新中にエラーが発生しました" });
  }
};