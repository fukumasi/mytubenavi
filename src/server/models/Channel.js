const mongoose = require('mongoose');
const slugify = require('slugify');

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
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  bannerImage: {
    type: String,
    default: 'default-banner.png'
  },
  customUrl: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    maxlength: [30, 'カスタムURLは30文字以下である必要があります']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  socialLinks: {
    website: {
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} は有効なURLではありません`
      }
    },
    facebook: {
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^(https?:\/\/)?(www\.)?facebook.com\/[a-zA-Z0-9(\.\?)?]/.test(v);
        },
        message: props => `${props.value} は有効なFacebookリンクではありません`
      }
    },
    twitter: {
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^(https?:\/\/)?(www\.)?twitter.com\/[a-zA-Z0-9_]+$/.test(v);
        },
        message: props => `${props.value} は有効なTwitterリンクではありません`
      }
    },
    instagram: {
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^(https?:\/\/)?(www\.)?instagram.com\/[a-zA-Z0-9_]+$/.test(v);
        },
        message: props => `${props.value} は有効なInstagramリンクではありません`
      }
    }
  },
  statistics: {
    viewCount: { type: Number, default: 0, min: 0 },
    subscriberCount: { type: Number, default: 0, min: 0 },
    videoCount: { type: Number, default: 0, min: 0 }
  },
  category: {
    type: String,
    required: [true, 'カテゴリーは必須です'],
    enum: ['music', 'sports', 'gaming', 'education', 'entertainment', 'news', 'other']
  },
  tags: [{
    type: String,
    trim: true
  }],
  language: {
    type: String,
    required: [true, '言語は必須です'],
    default: 'ja'
  },
  ageRestriction: {
    type: String,
    enum: ['all', '13+', '18+'],
    default: 'all'
  },
  creationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// インデックスの作成
channelSchema.index({ name: 'text', description: 'text' });
channelSchema.index({ owner: 1, category: 1 });
channelSchema.index({ tags: 1 });
channelSchema.index({ 'statistics.subscriberCount': -1 });
channelSchema.index({ 'statistics.viewCount': -1 });
channelSchema.index({ customUrl: 1 });

// カスタムURLの自動生成
channelSchema.pre('save', function(next) {
  if (!this.customUrl) {
    this.customUrl = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

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

// チャンネルの人気度を計算するメソッド
channelSchema.methods.calculatePopularity = function() {
  const subscriberWeight = 2;
  const viewWeight = 1;
  return (this.statistics.subscriberCount * subscriberWeight) + (this.statistics.viewCount * viewWeight);
};

// チャンネルの収益を計算するメソッド（仮想的な実装）
channelSchema.methods.calculateRevenue = async function() {
  const revenuePerView = 0.001; // 1000回再生で1円と仮定
  const revenuePerSubscriber = 0.1; // 購読者1人あたり0.1円と仮定
  return (this.statistics.viewCount * revenuePerView) + (this.statistics.subscriberCount * revenuePerSubscriber);
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;