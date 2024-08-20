const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: String,  // YouTube video ID
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'コメントは500文字以内である必要があります']
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  isReply: {
    type: Boolean,
    default: false
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  }
}, {
  timestamps: true
});

// インデックスの作成
commentSchema.index({ video: 1, createdAt: -1 });

// 仮想フィールド: 返信の数
commentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// JSONに変換する際に仮想フィールドを含める
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;