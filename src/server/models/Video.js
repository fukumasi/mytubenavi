const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  // ... 既存のスキーマ定義
});

// インデックスの追加
videoSchema.index({ title: 'text', description: 'text' });
videoSchema.index({ genre: 1, viewCount: -1 });
videoSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Video', videoSchema);