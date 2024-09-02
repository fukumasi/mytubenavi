const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require('crypto');

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
    minlength: [12, 'パスワードは12文字以上である必要があります'],
    select: false,
    validate: {
      validator: function(v) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(v);
      },
      message: 'パスワードは少なくとも1つの大文字、小文字、数字、特殊文字を含む必要があります'
    }
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
  recoveryCodes: [{ type: String, select: false }],
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
  loginHistory: [{
    date: { type: Date, default: Date.now },
    ip: String,
    userAgent: String
  }],
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
  }],
  activeSessions: [{
    token: String,
    expiresAt: Date,
    userAgent: String,
    ip: String
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
}, {
  timestamps: true
});

// インデックスの追加
userSchema.index({ email: 1, username: 1 });
userSchema.index({ 'watchHistory.video': 1, 'watchHistory.watchedAt': -1 });
userSchema.index({ isDeleted: 1 });

// パスワードのハッシュ化
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    if (!this.passwordHistory) {
      this.passwordHistory = [];
    }
    this.passwordHistory.unshift(this.password);
    
    // 最新の5つのパスワードのみを保持
    this.passwordHistory = this.passwordHistory.slice(0, 5);

    next();
  } catch (error) {
    next(error);
  }
});

// パスワードの検証
userSchema.methods.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// 過去に使用されたパスワードかどうかを確認
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

// ログイン試行回数の増加
userSchema.methods.incrementLoginAttempts = function() {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.isLocked = true;
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30分後にロック解除
  }
  return this.save();
};

// ログイン試行回数のリセット
userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.isLocked = false;
  this.lockUntil = undefined;
  return this.save();
};

// パスワードリセットトークンの生成
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10分後に期限切れ
  return resetToken;
};

// メール確認トークンの生成
userSchema.methods.generateEmailConfirmToken = function() {
  const confirmToken = crypto.randomBytes(32).toString('hex');
  this.emailConfirmToken = crypto
    .createHash('sha256')
    .update(confirmToken)
    .digest('hex');
  this.emailConfirmTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24時間後に期限切れ
  return confirmToken;
};

// フルネームの取得
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// 視聴履歴への追加
userSchema.methods.addToWatchHistory = function(videoId) {
  const watchEntry = this.watchHistory.find(entry => entry.video.toString() === videoId.toString());
  if (watchEntry) {
    watchEntry.watchedAt = new Date();
  } else {
    this.watchHistory.push({ video: videoId });
  }
  return this.save();
};

// お気に入りへの追加
userSchema.methods.addToFavorites = function(videoId) {
  if (!this.favorites.includes(videoId)) {
    this.favorites.push(videoId);
  }
  return this.save();
};

// お気に入りからの削除
userSchema.methods.removeFromFavorites = function(videoId) {
  this.favorites = this.favorites.filter(id => id.toString() !== videoId.toString());
  return this.save();
};

// チャンネルの購読
userSchema.methods.subscribeToChannel = function(channelId) {
  if (!this.subscribedChannels.includes(channelId)) {
    this.subscribedChannels.push(channelId);
  }
  return this.save();
};

// チャンネルの購読解除
userSchema.methods.unsubscribeFromChannel = function(channelId) {
  this.subscribedChannels = this.subscribedChannels.filter(id => id.toString() !== channelId.toString());
  return this.save();
};

// おすすめ動画の更新
userSchema.methods.updateRecommendations = function(videoIds) {
  this.recommendations = videoIds;
  return this.save();
};

// チャンネルを購読しているかどうかの確認
userSchema.methods.isSubscribedTo = function(channelId) {
  return this.subscribedChannels.some(id => id.toString() === channelId.toString());
};

// 動画をお気に入りに入れているかどうかの確認
userSchema.methods.hasLiked = function(videoId) {
  return this.favorites.some(id => id.toString() === videoId.toString());
};

// 最終ログイン日時の更新
userSchema.methods.updateLastLogin = function(ip, userAgent) {
  this.lastLogin = new Date();
  this.loginHistory.push({ date: this.lastLogin, ip, userAgent });
  return this.save();
};

// 二要素認証の有効化
userSchema.methods.enableTwoFactor = function(secret, recoveryCodes) {
  this.twoFactorSecret = secret;
  this.twoFactorEnabled = true;
  this.recoveryCodes = recoveryCodes;
  return this.save();
};

// 二要素認証の無効化
userSchema.methods.disableTwoFactor = function() {
  this.twoFactorSecret = undefined;
  this.twoFactorEnabled = false;
  this.recoveryCodes = [];
  return this.save();
};

// リカバリーコードの検証
userSchema.methods.verifyRecoveryCode = function(code) {
  const index = this.recoveryCodes.indexOf(code);
  if (index !== -1) {
    this.recoveryCodes.splice(index, 1);
    return this.save();
  }
  return false;
};

// リカバリーコードの再生成
userSchema.methods.regenerateRecoveryCodes = function(newCodes) {
  this.recoveryCodes = newCodes;
  return this.save();
};

// プロフィールの更新
userSchema.methods.updateProfile = function(profileData) {
  const allowedFields = ['firstName', 'lastName', 'bio', 'avatar', 'preferences', 'socialLinks'];
  allowedFields.forEach(field => {
    if (profileData[field] !== undefined) {
      this[field] = profileData[field];
    }
  });
  return this.save();
};

// アカウントの削除（ソフトデリート）
userSchema.methods.deleteAccount = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.email = `deleted_${this._id}@example.com`;
  this.username = `deleted_user_${this._id}`;
  return this.save();
};

// セッションの追加
userSchema.methods.addSession = function(token, expiresAt, userAgent, ip) {
  this.activeSessions.push({ token, expiresAt, userAgent, ip });
  return this.save();
};

// セッションの削除
userSchema.methods.removeSession = function(token) {
  this.activeSessions = this.activeSessions.filter(session => session.token !== token);
  return this.save();
};

// メールアドレスでユーザーを検索
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isDeleted: false });
};

// ユーザー名でユーザーを検索
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username, isDeleted: false });
};

// JSONへの変換時に機密情報を除外
userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.passwordHistory;
    delete ret.twoFactorSecret;
    delete ret.recoveryCodes;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpire;
    delete ret.emailConfirmToken;
    delete ret.emailConfirmTokenExpire;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;

// TODO: パスワード有効期限の実装
// TODO: ユーザーアクティビティログの詳細な実装
// TODO: ロールベースのアクセス制御（RBAC）の実装
// TODO: ユーザープロフィールの公開/非公開設定
// TODO: ユーザー間のフォロー/フォロワー機能の実装
// TODO: ユーザーレベル（経験値）システムの実装
// TODO: ユーザーバッジシステムの実装
// TODO: 多要素認証（MFA）のサポート拡張
// TODO: ソーシャルログイン連携の実装
// TODO: ユーザーデータのエクスポート機能の実装
// TODO: アカウントの回復プロセスの実装
// TODO: ユーザーの行動分析と不正検知システムの統合
// TODO: GDPR準拠のためのデータ管理機能の拡張
// TODO: ユーザーフィードバックシステムの実装
// TODO: アカウントのマージ機能の実装（複数アカウントの統合）
// TODO: リカバリーコードの使用履歴の追跡
// TODO: 2要素認証のバックアップ方法の多様化（SMSなど）