const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'タイトルは必須です'],
    trim: true,
    maxlength: [100, 'タイトルは100文字以下である必要があります']
  },
  description: {
    type: String,
    required: [true, '説明は必須です'],
    maxlength: [5000, '説明は5000文字以下である必要があります']
  },
  youtubeId: {
    type: String,
    required: [true, 'YouTube IDは必須です'],
    unique: true
  },
  genre: {
    type: String,
    required: [true, 'ジャンルは必須です']
  },
  tags: [{
    type: String,
    trim: true
  }],
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true
  },
  duration: {
    type: Number,
    required: [true, '動画の長さは必須です'],
    min: [0, '動画の長さは0秒以上である必要があります']
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  dislikeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: [true, 'コメント内容は必須です'],
      maxlength: [1000, 'コメントは1000文字以下である必要があります']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  thumbnail: {
    type: String,
    required: [true, 'サムネイルは必須です']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isPaidContent: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  relatedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  fanGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FanGroup'
  }],
  category: {
    type: String,
    required: [true, 'カテゴリーは必須です'],
    enum: ['music', 'sports', 'gaming', 'education', 'entertainment', 'news', 'other']
  },
  averageWatchTime: {
    type: Number,
    default: 0,
    min: 0
  },
  ageRestriction: {
    type: String,
    enum: ['all', '13+', '18+'],
    default: 'all'
  },
  language: {
    type: String,
    required: [true, '言語は必須です'],
    default: 'ja'
  },
  subtitles: [{
    language: String,
    url: String
  }],
  quality: {
    type: String,
    enum: ['240p', '360p', '480p', '720p', '1080p', '4K'],
    default: '720p'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// インデックスの最適化
videoSchema.index({ title: "text", description: "text", tags: "text" });
videoSchema.index({ genre: 1, viewCount: -1, publishedAt: -1 });
videoSchema.index({ category: 1, language: 1 });
videoSchema.index({ youtubeId: 1 });
videoSchema.index({ isPrivate: 1, isPaidContent: 1, ageRestriction: 1 });
videoSchema.index({ duration: 1, likeCount: -1, dislikeCount: -1, averageWatchTime: -1 });

// 視聴回数を増やすメソッド
videoSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// いいね数を増やすメソッド
videoSchema.methods.incrementLikeCount = function() {
  this.likeCount += 1;
  return this.save();
};

// コメントを追加するメソッド
videoSchema.methods.addComment = function(userId, text) {
  this.comments.push({ user: userId, text });
  return this.save();
};

// 関連動画を追加するメソッド
videoSchema.methods.addRelatedVideo = function(videoId) {
  if (!this.relatedVideos.includes(videoId)) {
    this.relatedVideos.push(videoId);
  }
  return this.save();
};

// ファングループを追加するメソッド
videoSchema.methods.addFanGroup = function(fanGroupId) {
  if (!this.fanGroups.includes(fanGroupId)) {
    this.fanGroups.push(fanGroupId);
  }
  return this.save();
};

// 平均視聴時間を更新するメソッド
videoSchema.methods.updateAverageWatchTime = function(watchTime) {
  const totalWatchTime = this.averageWatchTime * this.viewCount + watchTime;
  this.averageWatchTime = totalWatchTime / (this.viewCount + 1);
  return this.save();
};

// 動画の評価を計算する仮想フィールド
videoSchema.virtual('rating').get(function() {
  const totalVotes = this.likeCount + this.dislikeCount;
  if (totalVotes === 0) return 0;
  return (this.likeCount / totalVotes) * 5; // 5段階評価に変換
});

// エンゲージメント率を計算する仮想フィールド
videoSchema.virtual('engagementRate').get(function() {
  const totalInteractions = this.likeCount + this.dislikeCount + this.comments.length;
  return (totalInteractions / this.viewCount) * 100;
});

// 動画の人気度を計算する仮想フィールド
videoSchema.virtual('popularity').get(function() {
  const viewWeight = 1;
  const likeWeight = 2;
  const commentWeight = 3;
  return (this.viewCount * viewWeight) + (this.likeCount * likeWeight) + (this.comments.length * commentWeight);
});

// 動画の収益を計算するメソッド（仮想通貨や広告収入を考慮）
videoSchema.methods.calculateRevenue = async function() {
  // ここに収益計算のロジックを実装
  // 例: 広告収入 + 有料視聴収入
  const adRevenue = this.viewCount * 0.001; // 1000回再生で1円と仮定
  const paidViewRevenue = this.isPaidContent ? this.viewCount * this.price : 0;
  return adRevenue + paidViewRevenue;
};

// スキーマフックを使用してビデオ削除時に関連データも削除
videoSchema.pre('remove', async function(next) {
  // 関連するコメントやいいねなどを削除するロジックをここに実装
  // 例: await Comment.deleteMany({ video: this._id });
  next();
});

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;