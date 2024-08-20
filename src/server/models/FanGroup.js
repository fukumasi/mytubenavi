const mongoose = require('mongoose');

const fanGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'グループ名は必須です'],
    unique: true,
    trim: true,
    minlength: [3, 'グループ名は3文字以上である必要があります'],
    maxlength: [50, 'グループ名は50文字以下である必要があります']
  },
  description: {
    type: String,
    required: [true, 'グループの説明は必須です'],
    maxlength: [500, '説明は500文字以下である必要があります']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  associatedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  avatar: String,
  bannerImage: String
}, {
  timestamps: true
});

// インデックスの作成
fanGroupSchema.index({ name: 1 });
fanGroupSchema.index({ tags: 1 });

// メンバー数を取得する仮想プロパティ
fanGroupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// メンバーを追加するメソッド
fanGroupSchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
  }
  return this.save();
};

// メンバーを削除するメソッド
fanGroupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.toString() !== userId.toString());
  return this.save();
};

// 関連動画を追加するメソッド
fanGroupSchema.methods.addAssociatedVideo = function(videoId) {
  if (!this.associatedVideos.includes(videoId)) {
    this.associatedVideos.push(videoId);
  }
  return this.save();
};

const FanGroup = mongoose.model('FanGroup', fanGroupSchema);

module.exports = FanGroup;