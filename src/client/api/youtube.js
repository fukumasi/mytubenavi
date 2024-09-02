import axios from "axios";

const API_BASE_URL = "/api/youtube";
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const handleApiError = (error, errorMessage) => {
  console.error(errorMessage, error);
  if (error.response) {
    console.error("Response data:", error.response.data);
    console.error("Response status:", error.response.status);
  } else if (error.request) {
    console.error("No response received:", error.request);
  } else {
    console.error("Error setting up request:", error.message);
  }
  throw new Error(errorMessage);
};

const dummyVideos = [
  {
    id: "dQw4w9WgXcQ",
    snippet: {
      title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
      description: "The official video for \"Never Gonna Give You Up\" by Rick Astley...",
      channelTitle: "Rick Astley",
      publishedAt: "2009-10-25T06:57:33Z",
      thumbnails: {
        medium: { url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" }
      }
    },
    statistics: {
      viewCount: "1234567890",
      likeCount: "12345678",
      commentCount: "1234567"
    },
    category: "music",
    duration: 213,
    rating: 4.8
  },
  // ... 他のダミービデオデータ（同様に category, duration, rating を追加）
];

const getDummyVideoDetails = (videoId) => {
  const video = dummyVideos.find(v => v.id === videoId) || dummyVideos[0];
  return { ...video, id: videoId };
};

const getDummyRelatedVideos = (videoId) => {
  return dummyVideos.filter(v => v.id !== videoId);
};

export const getDummyVideos = () => {
  return dummyVideos;
};

const apiGet = async (endpoint, params = {}) => {
  if (IS_DEVELOPMENT) {
    console.log(`Using dummy data for: ${endpoint}`);
    switch (endpoint) {
      case '/search':
        const filteredVideos = filterDummyVideos(params);
        return {
          videos: filteredVideos,
          totalVideos: filteredVideos.length,
          totalPages: Math.ceil(filteredVideos.length / 20)
        };
      case '/featured':
        return getDummyVideos().slice(0, 3);
      default:
        return getDummyVideos();
    }
  }

  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, { params });
    return response.data;
  } catch (error) {
    handleApiError(error, `APIリクエスト中にエラーが発生しました: ${endpoint}`);
  }
};

const filterDummyVideos = (params) => {
  let filteredVideos = [...dummyVideos];

  // 検索クエリに関係なく、すべてのダミーデータを返す
  // if (params.q) {
  //   const searchTerm = params.q.toLowerCase();
  //   filteredVideos = filteredVideos.filter(video => 
  //     video.snippet.title.toLowerCase().includes(searchTerm) ||
  //     video.snippet.description.toLowerCase().includes(searchTerm)
  //   );
  // }

  if (params.category) {
    filteredVideos = filteredVideos.filter(video => video.category === params.category);
  }

  if (params.duration) {
    switch (params.duration) {
      case 'short':
        filteredVideos = filteredVideos.filter(video => video.duration <= 240);
        break;
      case 'medium':
        filteredVideos = filteredVideos.filter(video => video.duration > 240 && video.duration <= 1200);
        break;
      case 'long':
        filteredVideos = filteredVideos.filter(video => video.duration > 1200);
        break;
    }
  }

  if (params.uploadDate) {
    const now = new Date();
    let dateLimit;
    switch (params.uploadDate) {
      case 'hour':
        dateLimit = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        dateLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateLimit = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        dateLimit = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }
    if (dateLimit) {
      filteredVideos = filteredVideos.filter(video => new Date(video.snippet.publishedAt) >= dateLimit);
    }
  }

  if (params.sortBy) {
    const [sortKey, sortDirection] = params.sortBy.split(',');
    const sortMultiplier = sortDirection === 'ascending' ? 1 : -1;

    switch (sortKey) {
      case 'date':
        filteredVideos.sort((a, b) => sortMultiplier * (new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt)));
        break;
      case 'viewCount':
        filteredVideos.sort((a, b) => sortMultiplier * (parseInt(b.statistics.viewCount) - parseInt(a.statistics.viewCount)));
        break;
      case 'rating':
        filteredVideos.sort((a, b) => sortMultiplier * (b.rating - a.rating));
        break;
      case 'duration':
        filteredVideos.sort((a, b) => sortMultiplier * (a.duration - b.duration));
        break;
      case 'category':
        filteredVideos.sort((a, b) => sortMultiplier * a.category.localeCompare(b.category));
        break;
      case 'relevance':
        // relevanceのソートロジックは実装が必要です
        break;
    }
  }

  return filteredVideos;
};

export const searchVideos = async (params) => {
  const result = await apiGet('/search', params);
  return result;
};

export const getVideoDetails = async (videoId) => {
  if (IS_DEVELOPMENT) {
    console.log("Using dummy video details");
    return getDummyVideoDetails(videoId);
  }
  return apiGet(`/videos/${videoId}`);
};

export const getRelatedVideos = async (videoId) => {
  if (!videoId) {
    throw new Error("動画IDが指定されていません");
  }
  if (IS_DEVELOPMENT) {
    return getDummyRelatedVideos(videoId);
  }
  return apiGet(`/videos/${videoId}/related`);
};

export const getFeaturedVideos = async () => {
  const videos = await apiGet('/featured');
  return videos.map(video => ({
    id: video.id,
    title: video.snippet?.title || "タイトルなし",
    thumbnail: video.snippet?.thumbnails?.medium?.url || "https://via.placeholder.com/320x180",
    channelTitle: video.snippet?.channelTitle || "チャンネル名不明"
  }));
};

export const getPopularVideos = async (params) => {
  return apiGet('/videos/popular', params);
};

export const getVideoComments = async (videoId, params) => {
  if (IS_DEVELOPMENT) {
    console.log("Using dummy comments");
    return [
      { id: '1', text: 'Great video!', author: 'User1', likeCount: 10 },
      { id: '2', text: 'Interesting content', author: 'User2', likeCount: 5 },
    ];
  }
  return apiGet(`/videos/${videoId}/comments`, params);
};