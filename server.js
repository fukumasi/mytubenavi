const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
const authRoutes = require("./src/server/routes/auth");
const youtubeService = require("./src/server/services/youtubeService");
const commentRoutes = require("./src/server/routes/comment");
const axios = require('axios');
const helmet = require('helmet');
const NodeCache = require("node-cache");
const rateLimit = require("express-rate-limit");
const { 
  loginLimiter, 
  apiLimiter, 
  searchLimiter, 
  videoLimiter, 
  relatedVideoLimiter, 
  featuredVideoLimiter,
  burstApiLimiter,
  burstSearchLimiter,
  burstVideoLimiter
} = require("./src/server/middleware/rateLimiter");

const app = express();
const cors = require('cors');
app.use(cors());

// キャッシュの設定
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 720 }); // キャッシュの有効期間を1時間に延長

// Helmetを使用してセキュリティヘッダーを設定
app.use(helmet());

// グローバルAPI制限の適用
app.use("/api", apiLimiter, burstApiLimiter);

// エンドポイント固有のレート制限を適用
app.use("/api/search", searchLimiter, burstSearchLimiter);
app.use("/api/videos", videoLimiter, burstVideoLimiter);
app.use("/api/videos/:id/related", relatedVideoLimiter, burstVideoLimiter);
app.use("/api/featured-videos", featuredVideoLimiter, burstVideoLimiter);

// Content Security Policy (CSP) の設定
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "img-src 'self' data: https: http:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "frame-src 'self' https://www.youtube.com"
  );
  next();
});

// タイムアウトの設定を120秒に延長
app.use((req, res, next) => {
  res.setTimeout(120000, () => {
    console.log('Request has timed out.');
    res.status(504).send('Server Timeout');
  });
  next();
});

// MongoDB接続
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ミドルウェア
app.use(express.json());

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, "build")));

// API ルート
const featuredVideoRoutes = require("./src/server/routes/featuredVideos");
app.use("/api/featured-videos", featuredVideoRoutes);

// 認証ルートを追加
app.use("/api/auth", authRoutes);

// コメントルートを追加
app.use("/api/comments", commentRoutes);

// 画像プロキシエンドポイント
app.get("/api/image-proxy", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send('Image URL is required');
  }

  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 10000, // 10秒のタイムアウトを設定
    });
    const contentType = response.headers['content-type'];
    res.set('Content-Type', contentType);
    res.send(response.data);
  } catch (error) {
    console.error('Error proxying image:', error.message);
    if (error.code === 'ECONNABORTED') {
      res.status(504).send('Image proxy request timed out');
    } else {
      res.status(500).send(`Error proxying image: ${error.message}`);
    }
  }
});



// YouTube検索API（キャッシュ付き）
app.get("/api/search", async (req, res, next) => {
  const query = req.query.q;
  const cacheKey = `search_${query}`;

  try {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    console.log("Received search request for:", query);
    const data = await youtubeService.searchVideos(query);
    if (data.error) {
      return handleYouTubeApiError(data.error, res, 'search videos');
    }
    cache.set(cacheKey, data);
    console.log("YouTube API response:", data);
    res.json(data);
  } catch (error) {
    console.error("Error searching videos:", error);
    next(error);
  }
});

// YouTube APIエラーハンドリング関数
function handleYouTubeApiError(error, res, action) {
  console.error(`Error ${action}:`, error);
  if (error.message === "YouTube API quota exceeded" || (error.response && error.response.status === 403)) {
    res.status(429).json({ error: "YouTube API quota exceeded. Please try again later." });
  } else if (error.message === "Video not found") {
    res.status(404).json({ error: 'Video not found' });
  } else {
    res.status(error.response?.status || 500).json({ 
      error: `Failed to ${action}`, 
      details: error.message,
      youtubeError: error.response?.data?.error?.message || error.message
    });
  }
}

// すべてのリクエストをReactアプリにリダイレクト
app.get("*", (req, res) => {
  console.log("Serving React app");
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// グローバルエラーハンドラー
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  const statusCode = err.status || 500;
  const errorResponse = {
    error: "Internal Server Error",
    message: err.message,
    status: statusCode,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
  console.error('Error response:', errorResponse);
  res.status(statusCode).json(errorResponse);
});

// パフォーマンス監視とログ記録のためのミドルウェア
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// サーバーの状態監視用エンドポイント（開発環境専用）
if (process.env.NODE_ENV === 'development') {
  app.get('/api/server-status', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
  });
}

// YouTube APIのステータスを確認するエンドポイント
app.get('/api/youtube-api-status', async (req, res) => {
  try {
    const status = await youtubeService.checkApiStatus();
    res.json({ status: status ? 'OK' : 'Error', message: status ? 'YouTube API is accessible' : 'YouTube API is currently unavailable' });
  } catch (error) {
    res.status(503).json({ status: 'Error', message: 'YouTube API is currently unavailable', details: error.message });
  }
});

// 定期的なAPIステータスチェック
setInterval(async () => {
  try {
    const status = await youtubeService.checkApiStatus();
    console.log(`YouTube API Status: ${status ? 'OK' : 'Error'}`);
  } catch (error) {
    console.error('Error checking YouTube API status:', error);
  }
}, 300000); // 5分ごとにチェック

module.exports = app;