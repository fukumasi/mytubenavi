const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'チャンネル名は必須です'],
    unique: true,
    trim: true,
    maxlength: [50, 'チャンネル名は50文字以下である必要があります']
  },
  description: {
    type: String,
    required: [true, 'チャンネルの説明は必須です'],
    maxlength: [1000, '説明は1000文字以下である必要があります']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscribers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  videos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  avatar: String,
  bannerImage: String,
  customUrl: {
    type: String,
    unique: true,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  socialLinks: {
    website: String,
    facebook: String,
    twitter: String,
    instagram: String
  },
  statistics: {
    viewCount: { type: Number, default: 0 },
    subscriberCount: { type: Number, default: 0 },
    videoCount: { type: Number, default: 0 }
  },
  category: String,
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// インデックスの作成
channelSchema.index({ name: 'text', description: 'text' });
channelSchema.index({ owner: 1 });
channelSchema.index({ category: 1 });
channelSchema.index({ tags: 1 });

// 購読者数を取得する仮想プロパティ
channelSchema.virtual('subscriberCount').get(function() {
  return this.subscribers.length;
});

// 動画数を取得する仮想プロパティ
channelSchema.virtual('videoCount').get(function() {
  return this.videos.length;
});

// 購読者を追加するメソッド
channelSchema.methods.addSubscriber = function(userId) {
  if (!this.subscribers.includes(userId)) {
    this.subscribers.push(userId);
    this.statistics.subscriberCount += 1;
  }
  return this.save();
};

// 購読者を削除するメソッド
channelSchema.methods.removeSubscriber = function(userId) {
  this.subscribers = this.subscribers.filter(sub => sub.toString() !== userId.toString());
  this.statistics.subscriberCount = this.subscribers.length;
  return this.save();
};

// 動画を追加するメソッド
channelSchema.methods.addVideo = function(videoId) {
  if (!this.videos.includes(videoId)) {
    this.videos.push(videoId);
    this.statistics.videoCount += 1;
  }
  return this.save();
};

// 総視聴回数を更新するメソッド
channelSchema.methods.updateViewCount = function(increment) {
  this.statistics.viewCount += increment;
  return this.save();
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;