// src/lib/youtube.ts
import axios from 'axios';
import { supabase } from './supabase';
import type { Video } from '../types';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
if (!API_KEY) {
console.error('YouTube API key is not set in environment variables');
}
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchItem {
id: {
  videoId: string;
};
snippet: {
  title: string;
  description: string; 
  thumbnails: {
    medium: {
      url: string;
    };
  };
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  categoryId: string;
};
}

interface YouTubeSearchResponse {
items: YouTubeSearchItem[];
pageInfo: {
  totalResults: number;
};
nextPageToken?: string;
}

interface YouTubeVideoDetailsItem {
id: string;
snippet: {
  title: string;
  description: string;
  thumbnails: {
    medium: {
      url: string;
    };
  };
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  categoryId: string;
  tags?: string[];
};
contentDetails: {
  duration: string;
};
statistics: {
  viewCount: string;
  likeCount?: string;
  commentCount?: string;
};
}

interface YouTubeVideoDetailsResponse {
items: YouTubeVideoDetailsItem[];
}

const categoryToGenre: Record<string, string> = {
'10': 'music',           
'20': 'gaming',          
'24': 'entertainment',   
'27': 'education',       
'28': 'technology',      
'26': 'lifestyle',       
'17': 'sports',          
'25': 'news',            
'15': 'pets-and-animals', 
'22': 'others',          
'1': 'entertainment',    
'2': 'cars'             
};

export interface YouTubePlayer {
destroy(): void;
loadVideoById(videoId: string): void;
playVideo(): void;
pauseVideo(): void;
stopVideo(): void;
getPlayerState(): number;
getCurrentTime(): number;
getDuration(): number;
isMuted(): boolean;
mute(): void;
unMute(): void;
setVolume(volume: number): void;
getVolume(): number;
setPlaybackQuality(quality: string): void;
getPlaybackQuality(): string;
}

export interface YouTubeEvent {
data: number;
target: YouTubePlayer;
}

export const extractVideoId = (url: string): string | null => {
const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
return match ? match[1] : null;
};

export const YouTubeAPI = {
async fetchInitialGenreVideos(genre: string) {
  const searchQueries = {
    music: 'music|音楽',
    gaming: 'gaming|ゲーム実況',
    entertainment: 'entertainment|エンターテイメント',
    education: 'education|講座|レッスン',
    technology: 'technology|テクノロジー|プログラミング',
    lifestyle: 'lifestyle|日常|vlog',
    sports: 'sports|スポーツ',
    news: 'news|ニュース'
  }[genre] || '';

  return await this.searchVideos(searchQueries, 20);
},

async searchVideos(query: string, maxResults: number = 10, pageToken?: string): Promise<{ videos: Video[]; totalResults: number; nextPageToken?: string }> {
  try {
    const response = await axios.get<YouTubeSearchResponse>(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        key: API_KEY,
        q: query,
        maxResults: maxResults,
        pageToken: pageToken,
        type: 'video',
        regionCode: 'JP',
        videoEmbeddable: 'true'  // 明示的に文字列に変更
      },
    });

    const { items, pageInfo, nextPageToken } = response.data;
    const videoIds = items.map(item => item.id.videoId).filter(Boolean);
    const videoDetails = await this.getVideoDetails(videoIds);

    const videos = await Promise.all(videoDetails.map(async (item) => {
      const genreSlug = categoryToGenre[item.snippet.categoryId] || 'others';
      const { data: genreData } = await supabase
        .from('genres')
        .select('id')
        .eq('slug', genreSlug)
        .single();

      const createdAt = new Date().toISOString();
      const viewCount = parseInt(item.statistics.viewCount);
      const likeCount = item.statistics.likeCount ? parseInt(item.statistics.likeCount) : 0;
      const rating = likeCount ? (likeCount / viewCount) * 5 : 0;

      const video: Video = {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: this.formatDuration(item.contentDetails.duration),
        viewCount,
        rating,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        commentCount: parseInt(item.statistics.commentCount || '0'),
        youtube_id: item.id,
        genre_id: genreData?.id,
        created_at: createdAt,
        updated_at: createdAt,
        youtuber: {
          channelName: item.snippet.channelTitle,
          channelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
          verificationStatus: 'unknown' as 'unknown'
        }
      };

      await supabase.from('videos').upsert({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: this.formatDuration(item.contentDetails.duration),
        view_count: parseInt(item.statistics.viewCount),
        rating: item.statistics.likeCount ? 
          (parseInt(item.statistics.likeCount) / parseInt(item.statistics.viewCount || '1')) * 5 : 0,
        genre_id: genreData?.id,
        published_at: item.snippet.publishedAt,
        channel_title: item.snippet.channelTitle,
        comment_count: parseInt(item.statistics.commentCount || '0'),
        youtube_id: item.id,
        created_at: createdAt,
        updated_at: createdAt
      });
      
      return video;
    }));

    return {
      videos,
      totalResults: pageInfo.totalResults,
      nextPageToken
    };
  } catch (err) {
    console.error('Error searching videos:', err);
    return { videos: [], totalResults: 0 };
  }
},

async getVideoDetails(ids: string | string[]): Promise<YouTubeVideoDetailsItem[]> {
  if (!ids) return [];
  try {
    const response = await axios.get<YouTubeVideoDetailsResponse>(`${BASE_URL}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        key: API_KEY,
        id: Array.isArray(ids) ? ids.join(',') : ids,
      },
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return [];
  }
},

formatDuration(duration: string): string {
  try {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '0:00';
    const hours = parseInt(match[1] || '0', 10) || 0;
    const minutes = parseInt(match[2] || '0', 10) || 0;
    const seconds = parseInt(match[3] || '0', 10) || 0;

    const totalMinutes = hours * 60 + minutes;
    const formattedMinutes = String(totalMinutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  } catch (err) {
    console.error('Error formatting duration:', err);
    return '0:00';
  }
},
};