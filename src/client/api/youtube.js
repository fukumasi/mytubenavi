import axios from 'axios';
import { error } from '../utils/logger';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';  // パスは実際のファイル構造に合わせて調整してください

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const handleApiError = (err, operation) => {
  console.error(`Error ${operation}:`, err);
  if (err.response) {
    console.error('Error response:', err.response.data);
    if (err.response.status === 403) {
      console.error('API Key may be invalid or quota exceeded. Please check your YouTube Data API key.');
    }
  }
  error(`Error ${operation}:`, err);
  throw err;
};

export const searchVideos = async (query, maxResults = 10, genreId = null) => {
  try {
    console.log('Searching videos with query:', query, 'genreId:', genreId);
    const params = {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      key: API_KEY,
    };

    if (genreId) {
      params.videoCategoryId = genreId;
    }

    const response = await axios.get(`${BASE_URL}/search`, { params });
    console.log('Search API Response:', response.data);
    return response.data.items;
  } catch (err) {
    handleApiError(err, 'searching videos');
  }
};

export const getVideoDetails = async (videoId) => {
  try {
    console.log('Getting video details for:', videoId);
    const response = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,topicDetails',
        id: videoId,
        key: API_KEY,
      },
    });
    console.log('Video details API Response:', response.data);
    return response.data.items[0];
  } catch (err) {
    handleApiError(err, 'getting video details');
  }
};

export const getPopularVideos = async (maxResults = 10, genreId = null) => {
  try {
    console.log('Getting popular videos. genreId:', genreId);
    const params = {
      part: 'snippet,statistics',
      chart: 'mostPopular',
      maxResults,
      regionCode: 'JP',
      key: API_KEY,
    };

    if (genreId) {
      params.videoCategoryId = genreId;
    }

    const response = await axios.get(`${BASE_URL}/videos`, { params });
    console.log('Popular videos API Response:', response.data);
    return response.data.items;
  } catch (err) {
    handleApiError(err, 'getting popular videos');
  }
};

export const getVideoComments = async (videoId, maxResults = 20) => {
  try {
    console.log('Getting video comments for:', videoId);
    const response = await axios.get(`${BASE_URL}/commentThreads`, {
      params: {
        part: 'snippet',
        videoId: videoId,
        maxResults,
        key: API_KEY,
      },
    });
    console.log('Video comments API Response:', response.data);
    return response.data.items;
  } catch (err) {
    handleApiError(err, 'getting video comments');
  }
};

export const getVideoCategories = async () => {
  try {
    console.log('Getting video categories');
    const response = await axios.get(`${BASE_URL}/videoCategories`, {
      params: {
        part: 'snippet',
        regionCode: 'JP',
        key: API_KEY,
      },
    });
    console.log('Video categories:', response.data.items);
    return response.data.items;
  } catch (err) {
    handleApiError(err, 'getting video categories');
  }
};

export const getVideosByCategory = async (categoryId, maxResults = 10) => {
  try {
    console.log('Getting videos by category:', categoryId);
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        type: 'video',
        videoCategoryId: categoryId,
        maxResults,
        order: 'viewCount',
        regionCode: 'JP',
        key: API_KEY,
      },
    });
    console.log('Videos by category API Response:', response.data);
    if (response.data.items.length === 0) {
      // カテゴリIDでの検索結果が0の場合、一般的な検索を行う
      const generalResponse = await axios.get(`${BASE_URL}/search`, {
        params: {
          part: 'snippet',
          type: 'video',
          q: await getCategoryName(categoryId), // カテゴリ名を検索クエリとして使用
          maxResults,
          order: 'viewCount',
          regionCode: 'JP',
          key: API_KEY,
        },
      });
      console.log('General search API Response:', generalResponse.data);
      return generalResponse.data.items;
    }
    return response.data.items;
  } catch (err) {
    handleApiError(err, 'getting videos by category');
  }
};

export const getCategoryName = async (categoryId) => {
  try {
    const response = await axios.get(`${BASE_URL}/videoCategories`, {
      params: {
        part: 'snippet',
        id: categoryId,
        key: API_KEY,
      },
    });
    if (response.data.items.length > 0) {
      return response.data.items[0].snippet.title;
    }
    return '';
  } catch (err) {
    handleApiError(err, 'getting category name');
  }
};

export const getVideosByGenre = async (genreId, maxResults = 20, sortConfig = { key: 'publishedAt', direction: 'desc' }) => {
  try {
    console.log('Getting videos by genre:', genreId);
    const genreDoc = await getDoc(doc(db, "genres", genreId));
    if (!genreDoc.exists()) {
      throw new Error('Genre not found');
    }
    const genreName = genreDoc.data().name;
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        type: 'video',
        q: genreName,
        maxResults,
        order: getSortOrder(sortConfig),
        regionCode: 'JP',
        key: API_KEY,
      },
    });
    console.log('Videos by genre API Response:', response.data);
    const videoIds = response.data.items.map(item => item.id.videoId).join(',');
    const detailedResponse = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics',
        id: videoIds,
        key: API_KEY,
      },
    });
    const detailedVideos = detailedResponse.data.items;
    return sortVideos(detailedVideos, sortConfig);
  } catch (err) {
    handleApiError(err, 'getting videos by genre');
  }
};

const getSortOrder = (sortConfig) => {
  switch (sortConfig.key) {
    case 'publishedAt':
      return 'date';
    case 'viewCount':
      return 'viewCount';
    case 'rating':
      return 'rating';
    default:
      return 'relevance';
  }
};

const sortVideos = (videos, sortConfig) => {
  return videos.sort((a, b) => {
    let aValue, bValue;
    switch (sortConfig.key) {
      case 'title':
        aValue = a.snippet.title.toLowerCase();
        bValue = b.snippet.title.toLowerCase();
        break;
      case 'channelTitle':
        aValue = a.snippet.channelTitle.toLowerCase();
        bValue = b.snippet.channelTitle.toLowerCase();
        break;
      case 'publishedAt':
        aValue = new Date(a.snippet.publishedAt).getTime();
        bValue = new Date(b.snippet.publishedAt).getTime();
        break;
      case 'viewCount':
        aValue = parseInt(a.statistics.viewCount || '0');
        bValue = parseInt(b.statistics.viewCount || '0');
        break;
      default:
        return 0;
    }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// その他のYouTube API関連の関数をここに追加