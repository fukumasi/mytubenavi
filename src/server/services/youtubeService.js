const { google } = require("googleapis");
const Video = require("../models/Video");
require("dotenv").config();

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

exports.searchVideos = async (query, maxResults = 50) => {
  try {
    const response = await youtube.search.list({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: maxResults,
    });

    return response.data.items;
  } catch (error) {
    console.error("Error searching videos:", error);
    throw error;
  }
};

exports.getVideoDetails = async (videoId) => {
  try {
    // ダミーデータの場合
    if (videoId.startsWith('video')) {
      return getDummyVideoDetails(videoId);
    }

    const response = await youtube.videos.list({
      part: "snippet,statistics,contentDetails",
      id: videoId,
    });

    if (response.data.items.length === 0) {
      throw new Error("Video not found");
    }

    return response.data.items[0];
  } catch (error) {
    console.error("Error getting video details:", error);
    throw error;
  }
};

exports.getRelatedVideos = async (videoId, maxResults = 10) => {
  try {
    // ダミーデータの場合は、ランダムな動画を返す
    if (videoId.startsWith('video')) {
      return getDummyRelatedVideos(maxResults);
    }

    const response = await youtube.search.list({
      part: "snippet",
      relatedToVideoId: videoId,
      type: "video",
      maxResults: maxResults,
    });

    return response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
    }));
  } catch (error) {
    console.error("Error getting related videos:", error);
    throw error;
  }
};

exports.getFeaturedVideos = async (maxResults = 10) => {
  try {
    // ここでは仮のロジックとしてトレンド動画を取得します
    // 実際のアプリケーションでは、データベースから特別に選択された動画を取得するなどの
    // ロジックに置き換えることができます
    const response = await youtube.videos.list({
      part: "snippet,statistics",
      chart: "mostPopular",
      regionCode: "JP", // 日本のトレンド動画を取得
      maxResults: maxResults,
    });

    return response.data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium.url,
      channelTitle: video.snippet.channelTitle,
      viewCount: video.statistics.viewCount,
    }));
  } catch (error) {
    console.error("Error getting featured videos:", error);
    throw error;
  }
};

// ダミーの動画詳細を生成する関数
function getDummyVideoDetails(videoId) {
  return {
    id: videoId,
    snippet: {
      title: `ダミー動画 ${videoId}`,
      description: `これはダミー動画 ${videoId} の説明です。`,
      channelTitle: "ダミーチャンネル",
      publishedAt: new Date().toISOString(),
      thumbnails: {
        medium: {
          url: `https://picsum.photos/320/180?random=${videoId}`,
        },
      },
    },
    statistics: {
      viewCount: Math.floor(Math.random() * 1000000).toString(),
      likeCount: Math.floor(Math.random() * 10000).toString(),
      commentCount: Math.floor(Math.random() * 1000).toString(),
    },
    contentDetails: {
      duration: "PT5M30S",
    },
  };
}

// ダミーの関連動画を生成する関数
function getDummyRelatedVideos(maxResults) {
  const dummyVideos = [];
  for (let i = 0; i < maxResults; i++) {
    dummyVideos.push({
      id: `dummy${i + 1}`,
      title: `関連動画 ${i + 1}`,
      thumbnail: `https://picsum.photos/200/150?random=${i + 1}`,
      channelTitle: `ダミーチャンネル ${i + 1}`,
    });
  }
  return dummyVideos;
}