const AdVideo = require('../models/AdVideo');
const { fetchYoutubeVideoDetails } = require('../utils/youtubeApi');
const { catchAsync } = require('../utils/errorHandlers');
const AppError = require('../utils/appError');

exports.addAdVideo = catchAsync(async (req, res, next) => {
  const { youtubeUrl, displayDateStart, displayDateEnd, price, tags, description } = req.body;
  const userId = req.user.id;

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return next(new AppError('無効なYouTube URLです', 400));
  }

  const videoDetails = await fetchYoutubeVideoDetails(videoId);
  if (!videoDetails) {
    return next(new AppError('YouTube動画が見つかりません', 404));
  }

  const existingAd = await AdVideo.findOne({
    $or: [
      { displayDateStart: { $lte: displayDateEnd }, displayDateEnd: { $gte: displayDateStart } },
      { displayDateStart: { $gte: displayDateStart, $lte: displayDateEnd } },
      { displayDateEnd: { $gte: displayDateStart, $lte: displayDateEnd } }
    ]
  });

  if (existingAd) {
    return next(new AppError('指定された期間に既に広告が予約されています', 400));
  }

  const adVideo = new AdVideo({
    youtubeId: videoId,
    title: videoDetails.title,
    description: description || videoDetails.description,
    thumbnail: videoDetails.thumbnail,
    creator: userId,
    displayDateStart,
    displayDateEnd,
    price,
    tags
  });

  await adVideo.save();

  res.status(201).json({
    status: 'success',
    data: { adVideo }
  });
});

exports.getAdVideos = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const sortBy = req.query.sortBy || '-createdAt';
  const filter = { creator: req.user.id };

  if (req.query.tag) {
    filter.tags = req.query.tag;
  }

  const adVideos = await AdVideo.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limit);

  const total = await AdVideo.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: adVideos.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: { adVideos }
  });
});

exports.getAdVideo = catchAsync(async (req, res, next) => {
  const adVideo = await AdVideo.findById(req.params.id);

  if (!adVideo) {
    return next(new AppError('広告動画が見つかりません', 404));
  }

  if (adVideo.creator.toString() !== req.user.id) {
    return next(new AppError('この広告動画にアクセスする権限がありません', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { adVideo }
  });
});

exports.updateAdVideo = catchAsync(async (req, res, next) => {
  const { displayDateStart, displayDateEnd, price, tags, description } = req.body;
  
  const adVideo = await AdVideo.findById(req.params.id);

  if (!adVideo) {
    return next(new AppError('広告動画が見つかりません', 404));
  }

  if (adVideo.creator.toString() !== req.user.id) {
    return next(new AppError('この広告動画を更新する権限がありません', 403));
  }

  if (displayDateStart && displayDateEnd) {
    const existingAd = await AdVideo.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { displayDateStart: { $lte: displayDateEnd }, displayDateEnd: { $gte: displayDateStart } },
        { displayDateStart: { $gte: displayDateStart, $lte: displayDateEnd } },
        { displayDateEnd: { $gte: displayDateStart, $lte: displayDateEnd } }
      ]
    });

    if (existingAd) {
      return next(new AppError('指定された期間に既に広告が予約されています', 400));
    }

    adVideo.displayDateStart = displayDateStart;
    adVideo.displayDateEnd = displayDateEnd;
  }

  if (price) adVideo.price = price;
  if (tags) adVideo.tags = tags;
  if (description) adVideo.description = description;

  await adVideo.save();

  res.status(200).json({
    status: 'success',
    data: { adVideo }
  });
});

exports.deleteAdVideo = catchAsync(async (req, res, next) => {
  const adVideo = await AdVideo.findById(req.params.id);

  if (!adVideo) {
    return next(new AppError('広告動画が見つかりません', 404));
  }

  if (adVideo.creator.toString() !== req.user.id) {
    return next(new AppError('この広告動画を削除する権限がありません', 403));
  }

  await AdVideo.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getActiveAdVideo = catchAsync(async (req, res) => {
  const currentDate = new Date();

  const activeAdVideo = await AdVideo.findOne({
    displayDateStart: { $lte: currentDate },
    displayDateEnd: { $gte: currentDate },
    isPaid: true
  });

  res.status(200).json({
    status: 'success',
    data: { activeAdVideo }
  });
});

exports.incrementViewCount = catchAsync(async (req, res, next) => {
  const adVideo = await AdVideo.findById(req.params.id);

  if (!adVideo) {
    return next(new AppError('広告動画が見つかりません', 404));
  }

  await adVideo.incrementViewCount();

  res.status(200).json({
    status: 'success',
    data: { viewCount: adVideo.viewCount }
  });
});

exports.incrementClickCount = catchAsync(async (req, res, next) => {
  const adVideo = await AdVideo.findById(req.params.id);

  if (!adVideo) {
    return next(new AppError('広告動画が見つかりません', 404));
  }

  await adVideo.incrementClickCount();

  res.status(200).json({
    status: 'success',
    data: { clickCount: adVideo.clickCount }
  });
});

exports.getAdStats = catchAsync(async (req, res, next) => {
  const adVideo = await AdVideo.findById(req.params.id);

  if (!adVideo) {
    return next(new AppError('広告動画が見つかりません', 404));
  }

  if (adVideo.creator.toString() !== req.user.id) {
    return next(new AppError('この広告動画の統計情報にアクセスする権限がありません', 403));
  }

  const stats = {
    viewCount: adVideo.viewCount,
    clickCount: adVideo.clickCount,
    ctr: adVideo.viewCount > 0 ? (adVideo.clickCount / adVideo.viewCount * 100).toFixed(2) : 0,
    startDate: adVideo.displayDateStart,
    endDate: adVideo.displayDateEnd
  };

  res.status(200).json({
    status: 'success',
    data: stats
  });
});

exports.getDailyStats = catchAsync(async (req, res, next) => {
  const adVideo = await AdVideo.findById(req.params.id);

  if (!adVideo) {
    return next(new AppError('広告動画が見つかりません', 404));
  }

  if (adVideo.creator.toString() !== req.user.id) {
    return next(new AppError('この広告動画の統計情報にアクセスする権限がありません', 403));
  }

  const dailyStats = await AdVideo.aggregate([
    { $match: { _id: adVideo._id } },
    { $unwind: '$dailyStats' },
    { $sort: { 'dailyStats.date': 1 } },
    {
      $project: {
        _id: 0,
        date: '$dailyStats.date',
        viewCount: '$dailyStats.viewCount',
        clickCount: '$dailyStats.clickCount'
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: dailyStats
  });
});

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

module.exports = exports;

// TODO: 広告のターゲティング機能の実装
// TODO: 広告の自動最適化アルゴリズムの導入
// TODO: リアルタイム統計更新のためのWebSocket実装
// TODO: 広告のA/Bテスト機能の追加
// TODO: 広告のROI計算機能の実装
// TODO: ユーザーセグメント別の統計情報取得
// TODO: 地域別のパフォーマンス分析機能
// TODO: 広告予算管理機能の追加
// TODO: 競合分析機能の実装
// TODO: AIを活用した広告パフォーマンス予測機能