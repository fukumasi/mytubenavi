import axios from 'axios';

const API_KEYS = [
  process.env.REACT_APP_YOUTUBE_API_KEY_1,
  process.env.REACT_APP_YOUTUBE_API_KEY_2
];
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

let currentKeyIndex = 0;

const getNextApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return API_KEYS[currentKeyIndex];
};

export const searchVideos = async (query) => {
  try {
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 20,
        key: getNextApiKey(),
      },
    });

    const videoIds = searchResponse.data.items.map(item => item.id.videoId).join(',');

    const videoDetailsResponse = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'statistics,contentDetails',
        id: videoIds,
        key: getNextApiKey(),
      },
    });

    const mergedResults = searchResponse.data.items.map(searchItem => {
      const detailItem = videoDetailsResponse.data.items.find(
        detailItem => detailItem.id === searchItem.id.videoId
      );
      return { ...searchItem, statistics: detailItem.statistics, contentDetails: detailItem.contentDetails };
    });

    return mergedResults;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      // API key quota exceeded, try with the next key
      if (currentKeyIndex < API_KEYS.length - 1) {
        return searchVideos(query);
      }
    }
    console.error('Error searching videos:', error);
    throw error;
  }
};