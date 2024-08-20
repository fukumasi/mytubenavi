const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  // 既存のフィールド
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
    default: 0
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },

  // 新しく追加するフィールド
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  duration: Number,
  likeCount: {
    type: Number,
    default: 0
  },
  dislikeCount: {
    type: Number,
    default: 0
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  thumbnail: String,
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
    default: 0
  },
  relatedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  fanGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FanGroup'
  }]
}, {
  timestamps: true
});

// インデックスの追加
videoSchema.index({ title: "text", description: "text" });
videoSchema.index({ genre: 1, viewCount: -1 });
videoSchema.index({ publishedAt: -1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ uploader: 1 });
videoSchema.index({ channel: 1 });

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

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;