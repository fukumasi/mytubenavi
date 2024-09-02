const axios = require('axios');
const AppError = require('./appError');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

exports.fetchYoutubeVideoDetails = async (videoId) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items.length === 0) {
      throw new AppError('指定されたIDの動画が見つかりません', 404);
    }

    const videoData = response.data.items[0];
    return {
      title: videoData.snippet.title,
      description: videoData.snippet.description,
      thumbnail: videoData.snippet.thumbnails.medium.url,
      viewCount: videoData.statistics.viewCount,
      likeCount: videoData.statistics.likeCount,
      publishedAt: videoData.snippet.publishedAt
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('YouTube API error:', error.response ? error.response.data : error.message);
    throw new AppError('YouTube APIからデータを取得中にエラーが発生しました', 500);
  }
};

exports.checkYoutubeApiQuota = async () => {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'id',
        chart: 'mostPopular',
        regionCode: 'JP',
        maxResults: 1,
        key: YOUTUBE_API_KEY
      }
    });
    return true; // API呼び出しが成功した場合、クォータが残っていると判断
  } catch (error) {
    if (error.response && error.response.data.error.errors[0].reason === 'quotaExceeded') {
      console.error('YouTube API quota exceeded');
      return false;
    }
    console.error('Error checking YouTube API quota:', error.message);
    return false; // エラーが発生した場合、安全のためfalseを返す
  }
};

exports.extractVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};