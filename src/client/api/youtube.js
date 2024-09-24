import axios from 'axios';
import { error } from '../utils/logger';

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const searchVideos = async (query, maxResults = 10) => {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults,
        key: API_KEY,
      },
    });
    return response.data.items;
  } catch (err) {
    error('Error searching videos:', err);
    throw err;
  }
};

// その他のYouTube API関連の関数をここに追加