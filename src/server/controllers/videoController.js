const Video = require('../models/Video');
const youtubeService = require('../services/youtubeService');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // 5分間キャッシュ

exports.getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 }).limit(20);
    res.json(videos);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    res.json(video);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Video not found' });
    }
    res.status(500).send('Server Error');
  }
};

exports.addVideo = async (req, res) => {
  try {
    const newVideo = new Video(req.body);
    const video = await newVideo.save();
    res.json(video);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    res.json(video);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ msg: 'Video not found' });
    }
    await video.remove();
    res.json({ msg: 'Video removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.searchAndSaveVideos = async (req, res) => {
  try {
    const { query, genreId } = req.body;
    const searchResults = await youtubeService.searchVideos(query);

    const savedVideos = [];
    for (const item of searchResults) {
      const videoDetails = await youtubeService.getVideoDetails(item.id.videoId);
      const savedVideo = await youtubeService.saveVideoToDatabase(videoDetails, genreId);
      savedVideos.push(savedVideo);
    }

    res.json(savedVideos);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.searchVideos = async (req, res) => {
  try {
    const { query, page = 1, limit = 10, genre, sort } = req.query;
    const skip = (page - 1) * limit;

    let searchQuery = {};
    if (query) {
      searchQuery = { $text: { $search: query } };
    }
    if (genre) {
      searchQuery.genre = genre;
    }

    let sortOption = {};
    switch (sort) {
      case 'viewCount':
        sortOption = { viewCount: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1 };
        break;
      case 'date':
        sortOption = { publishedAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const videos = await Video.find(searchQuery)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(searchQuery);

    res.json({
      videos,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalVideos: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getVideosByGenre = async (req, res) => {
  try {
    const { genreId } = req.params;
    const { page = 1, limit = 10, sort } = req.query;
    const skip = (page - 1) * limit;

    let sortOption = {};
    switch (sort) {
      case 'viewCount':
        sortOption = { viewCount: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1 };
        break;
      case 'date':
        sortOption = { publishedAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const videos = await Video.find({ genre: genreId })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments({ genre: genreId });

    res.json({
      videos,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalVideos: total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 新しく追加する人気動画取得メソッド
exports.getPopularVideos = async (req, res) => {
  try {
    const cachedVideos = cache.get('popularVideos');
    if (cachedVideos) {
      return res.json(cachedVideos);
    }

    const videos = await Video.find()
      .sort({ viewCount: -1 })
      .limit(10)
      .select('title thumbnail channelName viewCount');
    
    cache.set('popularVideos', videos);
    res.json(videos);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};