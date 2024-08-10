import axios from 'axios';

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const searchVideos = async (params) => {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        type: 'video',
        maxResults: 20,
        ...params,
        key: API_KEY,
      },
    });

    // 動画の詳細情報を取得
    const videoIds = response.data.items.map(item => item.id.videoId).join(',');
    const detailsResponse = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: 'statistics,contentDetails',
        id: videoIds,
        key: API_KEY,
      },
    });

    // 検索結果と詳細情報をマージ
    const mergedItems = response.data.items.map(item => {
      const details = detailsResponse.data.items.find(detail => detail.id === item.id.videoId);
      return { ...item, statistics: details.statistics, contentDetails: details.contentDetails };
    });

    return {
      items: mergedItems,
      pageInfo: response.data.pageInfo
    };
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
};

export const getDummyVideos = async () => {
  console.log('Getting dummy videos');
  return [
    {
      id: 'video1',
      snippet: {
        title: '猫が可愛すぎる瞬間',
        channelTitle: 'ねこチャンネル',
        thumbnails: {
          medium: { url: 'https://placekitten.com/320/180', width: 320, height: 180 },
        },
      },
      statistics: { viewCount: '1000000' },
      contentDetails: { duration: 'PT3M24S' },
    },
    {
      id: 'video2',
      snippet: {
        title: '犬と猫の仲良し動画',
        channelTitle: 'ペット大好き',
        thumbnails: {
          medium: { url: 'https://placedog.net/320/180', width: 320, height: 180 },
        },
      },
      statistics: { viewCount: '500000' },
      contentDetails: { duration: 'PT5M12S' },
    },
    // 他のダミービデオも同様に追加...
  ];
};

export const getFeaturedVideos = async () => {
  // 仮のfeatured videosを返す
  // 実際のAPIが実装されたら、そこからデータを取得するように変更する
  return [
    {
      id: 'featured1',
      title: '注目のトレンド動画',
      channelTitle: 'トレンドチャンネル',
      thumbnail: 'https://picsum.photos/320/180',
      viewCount: '2000000',
    },
    {
      id: 'featured2',
      title: '人気の料理レシピ',
      channelTitle: 'クッキングマスター',
      thumbnail: 'https://picsum.photos/320/180',
      viewCount: '1500000',
    },
  ];
};