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
    }
  },
  {
    id: "9bZkp7q19f0",
    snippet: {
      title: "PSY - GANGNAM STYLE(강남스타일) M/V",
      description: "PSY - 'I LUV IT' M/V @ https://youtu.be/Xvjnoagk6GU...",
      channelTitle: "officialpsy",
      publishedAt: "2012-07-15T07:46:32Z",
      thumbnails: {
        medium: { url: "https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg" }
      }
    },
    statistics: {
      viewCount: "4321098765",
      likeCount: "23456789",
      commentCount: "3456789"
    }
  },
  {
    id: "kJQP7kiw5Fk",
    snippet: {
      title: "Luis Fonsi - Despacito ft. Daddy Yankee",
      description: "\"Despacito\" disponible ya en todas las plataformas digitales...",
      channelTitle: "Luis Fonsi",
      publishedAt: "2017-01-12T15:00:21Z",
      thumbnails: {
        medium: { url: "https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg" }
      }
    },
    statistics: {
      viewCount: "7654321098",
      likeCount: "45678901",
      commentCount: "5678901"
    }
  },
  {
    id: "JGwWNGJdvx8",
    snippet: {
      title: "Ed Sheeran - Shape of You (Official Music Video)",
      description: "The official music video for Ed Sheeran - Shape Of You...",
      channelTitle: "Ed Sheeran",
      publishedAt: "2017-01-30T05:00:02Z",
      thumbnails: {
        medium: { url: "https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg" }
      }
    },
    statistics: {
      viewCount: "5678901234",
      likeCount: "34567890",
      commentCount: "4567890"
    }
  },
  {
    id: "OPf0YbXqDm0",
    snippet: {
      title: "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars",
      description: "Mark Ronson's official music video for 'Uptown Funk' ft. Bruno Mars...",
      channelTitle: "MarkRonsonVEVO",
      publishedAt: "2014-11-19T14:00:09Z",
      thumbnails: {
        medium: { url: "https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg" }
      }
    },
    statistics: {
      viewCount: "4567890123",
      likeCount: "23456789",
      commentCount: "3456789"
    }
  }
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
        return { items: getDummyVideos() };
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

export const searchVideos = async (params) => {
  const result = await apiGet('/search', params);
  return result.items || [];
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