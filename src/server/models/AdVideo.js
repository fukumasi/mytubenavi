const mongoose = require('mongoose');

const dailyStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const adVideoSchema = new mongoose.Schema({
  youtubeId: {
    type: String,
    required: [true, 'YouTube IDは必須です'],
    unique: true
  },
  title: {
    type: String,
    required: [true, 'タイトルは必須です'],
    trim: true,
    maxlength: [100, 'タイトルは100文字以下である必要があります']
  },
  description: {
    type: String,
    maxlength: [500, '説明は500文字以下である必要があります']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作成者は必須です']
  },
  displayDateStart: {
    type: Date,
    required: [true, '表示開始日は必須です']
  },
  displayDateEnd: {
    type: Date,
    required: [true, '表示終了日は必須です']
  },
  price: {
    type: Number,
    required: [true, '価格は必須です'],
    min: [0, '価格は0以上である必要があります']
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  thumbnail: {
    type: String,
    default: 'default-thumbnail.jpg'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'inactive'
  },
  dailyStats: [dailyStatsSchema]
}, {
  timestamps: true
});

// インデックスを作成
adVideoSchema.index({ displayDateStart: 1, displayDateEnd: 1 });
adVideoSchema.index({ creator: 1 });
adVideoSchema.index({ isPaid: 1 });
adVideoSchema.index({ tags: 1 });
adVideoSchema.index({ status: 1 });

// 表示回数を増やすメソッド
adVideoSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  this.updateDailyStats('viewCount');
  return this.save();
};

// クリック数を増やすメソッド
adVideoSchema.methods.incrementClickCount = function() {
  this.clickCount += 1;
  this.updateDailyStats('clickCount');
  return this.save();
};

// 日別統計情報を更新するメソッド
adVideoSchema.methods.updateDailyStats = function(field) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyStat = this.dailyStats.find(stat => stat.date.getTime() === today.getTime());

  if (dailyStat) {
    dailyStat[field] += 1;
  } else {
    this.dailyStats.push({
      date: today,
      [field]: 1
    });
  }
};

// CTRを計算するメソッド
adVideoSchema.methods.getCTR = function() {
  return this.viewCount > 0 ? (this.clickCount / this.viewCount * 100).toFixed(2) : 0;
};

// 広告が有効かどうかをチェックするメソッド
adVideoSchema.methods.isActive = function() {
  const now = new Date();
  return this.isPaid && 
         this.displayDateStart <= now && 
         this.displayDateEnd >= now &&
         this.status === 'active';
};

// 広告のステータスを更新するメソッド
adVideoSchema.methods.updateStatus = function() {
  const now = new Date();
  if (this.displayDateEnd < now) {
    this.status = 'completed';
  } else if (this.isPaid && this.displayDateStart <= now && this.displayDateEnd >= now) {
    this.status = 'active';
  } else {
    this.status = 'inactive';
  }
  return this.save();
};

const AdVideo = mongoose.model('AdVideo', adVideoSchema);

module.exports = AdVideo;

// TODO: 広告の予算管理機能の追加
// TODO: 広告のターゲティング情報の保存
// TODO: 広告のパフォーマンススコアの計算と保存
// TODO: A/Bテスト用の複数バージョン管理
// TODO: 広告の承認ワークフローのステータス管理
// TODO: 広告の表示回数の上限設定
// TODO: 地域別の統計情報の保存
// TODO: デバイス別の統計情報の保存
// TODO: 時間帯別の統計情報の保存
// TODO: ユーザーセグメント別の統計情報の保存