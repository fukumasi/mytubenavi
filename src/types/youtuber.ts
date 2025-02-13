// src/types/youtuber.ts

export interface YouTuberProfile {
  id?: string;
  channel_name: string;
  channel_url: string;
  channel_description?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  avatar_url?: string;
  category?: string;
  subscribers?: number;
  video_count?: number;
  total_views?: number;
  channel_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface YouTuberSyncResult {
  profile: YouTuberProfile;
  syncedVideosCount: number;
  syncedAt: Date;
}

export interface YouTuberChannelDetails {
  title: string;
  description: string;
  thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
  };
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  published_at: string;
  duration: string;
  view_count: number;
  rating?: number;
  genre_id?: string;
  channel_id: string;
  channel_title?: string;
  comment_count?: number;
  youtube_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'success';
  message: string;
  lastSyncedAt?: Date;
  error?: Error;
}

export interface YouTuberSyncOptions {
  force?: boolean;
  updateVideos?: boolean;
  updateStatistics?: boolean;
  limit?: number;
}