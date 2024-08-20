const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'ユーザー名は必須です'], 
    unique: true, 
    trim: true,
    minlength: [3, 'ユーザー名は3文字以上である必要があります'],
    maxlength: [30, 'ユーザー名は30文字以下である必要があります']
  },
  email: { 
    type: String, 
    required: [true, 'メールアドレスは必須です'], 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: props => `${props.value} は有効なメールアドレスではありません`
    }
  },
  password: { 
    type: String, 
    required: [true, 'パスワードは必須です'],
    minlength: [8, 'パスワードは8文字以上である必要があります'],
    select: false
  },
  userType: { 
    type: String, 
    enum: {
      values: ["viewer", "creator", "admin"],
      message: '{VALUE} は有効なユーザータイプではありません'
    }, 
    default: "viewer" 
  },
  twoFactorSecret: String,
  twoFactorEnabled: { type: Boolean, default: false },
  firstName: { 
    type: String,
    trim: true,
    maxlength: [50, '名前は50文字以下である必要があります']
  },
  lastName: { 
    type: String,
    trim: true,
    maxlength: [50, '姓は50文字以下である必要があります']
  },
  bio: { 
    type: String,
    maxlength: [500, 'プロフィールは500文字以下である必要があります']
  },
  avatar: String,
  preferences: {
    theme: { 
      type: String, 
      enum: {
        values: ["light", "dark"],
        message: '{VALUE} は有効なテーマではありません'
      }, 
      default: "light" 
    },
    language: { type: String, default: "ja" },
    notifications: { type: Boolean, default: true },
  },
  socialLinks: {
    twitter: { 
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/(www\.)?twitter\.com\/.+/i.test(v);
        },
        message: props => `${props.value} は有効なTwitterリンクではありません`
      }
    },
    instagram: { 
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/(www\.)?instagram\.com\/.+/i.test(v);
        },
        message: props => `${props.value} は有効なInstagramリンクではありません`
      }
    },
    youtube: { 
      type: String,
      validate: {
        validator: function(v) {
          return v === '' || /^https?:\/\/(www\.)?youtube\.com\/(channel|user)\/.+/i.test(v);
        },
        message: props => `${props.value} は有効なYouTubeリンクではありません`
      }
    },
  },
  passwordHistory: [{ type: String, select: false }],
  loginAttempts: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  lockUntil: Date,
  emailConfirmToken: String,
  emailConfirmTokenExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isEmailConfirmed: { type: Boolean, default: false },
  lastLogin: { type: Date },
  // 新しいフィールド
  fanGroups: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FanGroup' 
  }],
  watchHistory: [{
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    watchedAt: { type: Date, default: Date.now }
  }],
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  subscribedChannels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  recommendations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }]
}, {
  timestamps: true
});

// インデックスの作成
userSchema.index({ email: 1, username: 1 });
userSchema.index({ 'watchHistory.video': 1, 'watchHistory.watchedAt': -1 });

// パスワードハッシュ化とパスワード履歴の更新
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    // 新しいパスワードをハッシュ化
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // パスワード履歴を更新
    if (!this.passwordHistory) {
      this.passwordHistory = [];
    }
    this.passwordHistory.unshift(this.password);
    
    // パスワード履歴を最新の5つに制限
    this.passwordHistory = this.passwordHistory.slice(0, 5);

    next();
  } catch (error) {
    next(error);
  }
});

// パスワード検証メソッド
userSchema.methods.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// 過去のパスワードチェックメソッド
userSchema.methods.isPasswordUsedBefore = async function (password) {
  if (!this.passwordHistory || !Array.isArray(this.passwordHistory)) {
    return false;
  }

  for (const oldPassword of this.passwordHistory) {
    if (await bcrypt.compare(password, oldPassword)) {
      return true;
    }
  }
  return false;
};

// ログイン試行回数を増やすメソッド
userSchema.methods.incrementLoginAttempts = function() {
  this.loginAttempts += 1;
  return this.save();
};

// ユーザーのフルネームを取得するメソッド
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// 視聴履歴を追加するメソッド
userSchema.methods.addToWatchHistory = function(videoId) {
  const watchEntry = this.watchHistory.find(entry => entry.video.toString() === videoId.toString());
  if (watchEntry) {
    watchEntry.watchedAt = new Date();
  } else {
    this.watchHistory.push({ video: videoId });
  }
  return this.save();
};

// お気に入りに追加するメソッド
userSchema.methods.addToFavorites = function(videoId) {
  if (!this.favorites.includes(videoId)) {
    this.favorites.push(videoId);
  }
  return this.save();
};

// チャンネルを購読するメソッド
userSchema.methods.subscribeToChannel = function(channelId) {
  if (!this.subscribedChannels.includes(channelId)) {
    this.subscribedChannels.push(channelId);
  }
  return this.save();
};

// レコメンデーションを更新するメソッド
userSchema.methods.updateRecommendations = function(videoIds) {
  this.recommendations = videoIds;
  return this.save();
};

// JSONレスポンスからパスワードを除外
userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.passwordHistory;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;