const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const app = express();

const userRoutes = require('./routes/user');
const commentRoutes = require('./routes/comment');
const authRoutes = require('./routes/auth');
const featuredVideoRoutes = require('./routes/featuredVideos');
const adVideoRoutes = require('./routes/adVideoRoutes'); // 新しく追加
const youtubeService = require('./services/youtubeService');

// ミドルウェア
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// タイムアウトの設定を60秒に延長
app.use((req, res, next) => {
  res.setTimeout(60000, () => {
    console.log('Request has timed out.');
    res.status(504).send('Server Timeout');
  });
  next();
});

// MongoDB接続
mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../../build')));

// API ルート
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/featured-videos', featuredVideoRoutes);
app.use('/api/ad-videos', adVideoRoutes); // 新しく追加

// 動画詳細を取得するエンドポイント
app.get("/api/videos/:id", async (req, res) => {
  try {
    const videoId = req.params.id;
    console.log("Requested Video ID:", videoId);
    const data = await youtubeService.getVideoDetails(videoId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching video details:', error);
    if (error.message === "Video not found") {
      res.status(404).json({ error: 'Video not found' });
    } else {
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  }
});

// 関連動画を取得するエンドポイント
app.get("/api/videos/:id/related", async (req, res) => {
  try {
    const videoId = req.params.id;
    console.log("Requested Related Videos for ID:", videoId);
    const data = await youtubeService.getRelatedVideos(videoId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching related videos:', error);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// YouTube検索API
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  console.log("Received search request for:", query);

  try {
    const data = await youtubeService.searchVideos(query);
    console.log("YouTube API response:", data);
    res.json(data);
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// サンプルルートの設定
app.get('/api/sample', (req, res) => {
  res.status(200).json({ message: 'Sample response' });
});

// すべてのリクエストをReactアプリにリダイレクト
app.get("*", (req, res) => {
  console.log("Serving React app");
  res.sendFile(path.join(__dirname, '../../build', 'index.html'));
});

// グローバルエラーハンドラー
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!", details: err.message });
});

module.exports = app;