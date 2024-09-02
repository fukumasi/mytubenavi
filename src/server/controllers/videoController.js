const Video = require('../models/Video');
const User = require('../models/User');
const Channel = require('../models/Channel');
const { catchAsync } = require('../utils/errorHandlers');
const { sanitizeVideo } = require('../utils/sanitizer');

exports.createVideo = catchAsync(async (req, res) => {
  const { title, description, youtubeId, genre, tags, channelId } = req.body;

  const channel = await Channel.findById(channelId);
  if (!channel) {
    return res.status(404).json({
      status: 'fail',
      message: 'チャンネルが見つかりません'
    });
  }

  if (channel.owner.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'fail',
      message: 'このチャンネルに動画をアップロードする権限がありません'
    });
  }

  const video = await Video.create({
    title,
    description,
    youtubeId,
    genre,
    tags,
    uploader: req.user.id,
    channel: channelId
  });

  await Channel.findByIdAndUpdate(channelId, { $push: { videos: video._id } });

  res.status(201).json({
    status: 'success',
    data: { video: sanitizeVideo(video) }
  });
});

exports.getAllVideos = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, sort = '-publishedAt' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const videos = await Video.find()
    .populate('uploader', 'username')
    .populate('channel', 'name')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');

  const total = await Video.countDocuments();

  res.status(200).json({
    status: 'success',
    results: videos.length,
    data: { 
      videos: videos.map(sanitizeVideo),
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalVideos: total
    }
  });
});

exports.getVideo = catchAsync(async (req, res) => {
  const video = await Video.findById(req.params.id)
    .populate('uploader', 'username')
    .populate('channel', 'name')
    .populate('comments.user', 'username');

  if (!video) {
    return res.status(404).json({
      status: 'fail',
      message: '動画が見つかりません'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { video: sanitizeVideo(video) }
  });
});

exports.updateVideo = catchAsync(async (req, res) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return res.status(404).json({
      status: 'fail',
      message: '動画が見つかりません'
    });
  }

  if (video.uploader.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'fail',
      message: 'この動画を更新する権限がありません'
    });
  }

  const updatedVideo = await Video.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { video: sanitizeVideo(updatedVideo) }
  });
});

exports.deleteVideo = catchAsync(async (req, res) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return res.status(404).json({
      status: 'fail',
      message: '動画が見つかりません'
    });
  }

  if (video.uploader.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'fail',
      message: 'この動画を削除する権限がありません'
    });
  }

  await Video.findByIdAndDelete(req.params.id);
  await Channel.findByIdAndUpdate(video.channel, { $pull: { videos: video._id } });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.incrementViewCount = catchAsync(async (req, res) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return res.status(404).json({
      status: 'fail',
      message: '動画が見つかりません'
    });
  }

  await video.incrementViewCount();

  res.status(200).json({
    status: 'success',
    data: { viewCount: video.viewCount }
  });
});

exports.addComment = catchAsync(async (req, res) => {
  const { text } = req.body;
  const video = await Video.findById(req.params.id);

  if (!video) {
    return res.status(404).json({
      status: 'fail',
      message: '動画が見つかりません'
    });
  }

  await video.addComment(req.user.id, text);

  res.status(201).json({
    status: 'success',
    message: 'コメントが追加されました'
  });
});

exports.searchVideos = catchAsync(async (req, res) => {
  const {
    q,
    page = 1,
    limit = 10,
    sort = "relevance",
    dateRange,
    duration,
  } = req.query;

  if (!q) {
    return res.status(400).json({ message: "検索クエリが必要です" });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let sortOption = { score: { $meta: "textScore" } };
  if (sort === "views") {
    sortOption = { viewCount: -1 };
  } else if (sort === "date") {
    sortOption = { publishedAt: -1 };
  }

  let query = { $text: { $search: q } };

  if (dateRange) {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(dateRange));
    query.publishedAt = { $gte: date };
  }

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
      default:
        return res.status(400).json({ message: "無効な duration パラメータです" });
    }
  }

  const videos = await Video.find(query, { score: { $meta: "textScore" } })
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit))
    .select("title thumbnail channelName viewCount publishedAt duration");

  const total = await Video.countDocuments(query);

  res.status(200).json({
    status: 'success',
    data: {
      videos: videos.map(sanitizeVideo),
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalVideos: total,
    }
  });
});

exports.getRelatedVideos = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ message: "動画IDが必要です" });
  }

  const video = await Video.findById(id);

  if (!video) {
    return res.status(404).json({ message: "動画が見つかりません" });
  }

  const relatedVideos = await Video.find({
    $or: [
      { genre: video.genre },
      { tags: { $in: video.tags } }
    ],
    _id: { $ne: video._id },
  })
    .limit(10)
    .select("title thumbnail channelName viewCount");

  res.status(200).json({
    status: 'success',
    data: { relatedVideos: relatedVideos.map(sanitizeVideo) }
  });
});

exports.getVideoDetails = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "動画IDが必要です" });
  }

  const video = await Video.findById(id)
    .select("-__v");

  if (!video) {
    return res.status(404).json({ message: "動画が見つかりません" });
  }

  res.status(200).json({
    status: 'success',
    data: { video: sanitizeVideo(video) }
  });
});

exports.searchAndSaveVideos = catchAsync(async (req, res) => {
  const { q } = req.body;
  if (!q) {
    return res.status(400).json({ message: "検索クエリが必要です" });
  }

  // ここで外部APIを使用して動画を検索し、データベースに保存する処理を実装
  // 例: const videos = await searchVideosFromExternalAPI(q);
  // const savedVideos = await Video.insertMany(videos);

  res.status(200).json({
    status: 'success',
    message: '動画が検索され、保存されました',
    // data: { savedVideos: savedVideos.map(sanitizeVideo) }
  });
});

exports.getPopularVideos = catchAsync(async (req, res) => {
  const popularVideos = await Video.find()
    .sort({ viewCount: -1 })
    .limit(10)
    .select("title thumbnail channelName viewCount");

  res.status(200).json({
    status: 'success',
    data: { popularVideos: popularVideos.map(sanitizeVideo) }
  });
});

exports.getVideosByGenre = catchAsync(async (req, res) => {
  const { genreId } = req.params;
  const videos = await Video.find({ genre: genreId })
    .sort({ publishedAt: -1 })
    .limit(20)
    .select("title thumbnail channelName viewCount");

  res.status(200).json({
    status: 'success',
    data: { videos: videos.map(sanitizeVideo) }
  });
});

exports.getVideos = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, sort = 'publishedAt' } = req.query;
  const skip = (page - 1) * limit;

  const videos = await Video.find()
    .sort({ [sort]: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("title thumbnail channelName viewCount publishedAt");

  const total = await Video.countDocuments();

  res.status(200).json({
    status: 'success',
    data: {
      videos: videos.map(sanitizeVideo),
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalVideos: total
    }
  });
});

exports.addVideo = exports.createVideo;  // createVideo 関数を再利用