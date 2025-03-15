// src/types/Video.ts
import { AggregatedVideoRating } from './index';

export interface Video {
  // 基本情報
  id: string;
  title: string;
  description: string;
  thumbnail: string; // 主要なサムネイルプロパティ
  thumbnail_url?: string; // 互換性のため残す（非推奨）
  duration: string;
  youtube_id: string;

  // MyTubeNavi関連の評価・統計
  rating: number;
  avg_rating?: number;
  review_count: number;

  // 動画統計
  view_count: number;
  like_count?: number;
  comment_count?: number;

  // メタデータ
  channel_id?: string;
  channel_title: string;
  published_at: string;
  genre_id?: string;
  subgenre_id?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];

  // チャンネル情報
  youtuber?: {
    channelName: string;
    channelUrl: string;
    verificationStatus: 'unknown' | 'pending' | 'verified' | 'rejected';
    channel_id?: string;
    avatar_url?: string;
    subscribers?: number;
  };

  // 集計された評価情報
  ratings?: AggregatedVideoRating;
}

export interface VideoRating {
  id: string;
  video_id: string;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
  overall: number;
  clarity: number;
  entertainment: number;
  originality: number;
  quality: number;
  reliability: number;
  usefulness: number;
  comment: string;
  created_at?: string;
  updated_at?: string;
}

export interface VideoSearchParams {
  query?: string;
  genre_id?: string;
  sort_by?: 'published_at' | 'view_count' | 'rating';
  sort_direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface VideoSearchResult {
  videos: Video[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default Video;