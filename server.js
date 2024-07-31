const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// MongoDB接続
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// ミドルウェア
app.use(express.json());

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'build')));

// API ルート
const featuredVideoRoutes = require('./src/server/routes/featuredVideos');
app.use('/api/featured-videos', (req, res, next) => {
  console.log('Received request for featured videos');
  next();
}, featuredVideoRoutes);

// すべてのリクエストをReactアプリにリダイレクト
app.get('*', (req, res) => {
  console.log('Serving React app');
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));