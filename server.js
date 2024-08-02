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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
const axios = require('axios');

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY_1;

  console.log('Received search request for:', query); // 追加

  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 50,
        key: apiKey
      }
    });
    console.log('YouTube API response:', response.data); // 追加
    res.json(response.data);
  } catch (error) {
    console.error('YouTube API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: '動画の検索中にエラーが発生しました。' });
  }
});