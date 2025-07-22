// src/types/viewing.ts

export interface ViewingHistory {
  id: string;
  user_id: string;
  video_id: string;
  video_title?: string;
  channel_name?: string;
  category?: string;
  tags?: string[];
  viewing_duration?: number;
  video_length?: number;
  completion_rate?: number;
  user_rating?: number;
  watched_at: string;
}

export interface UserViewingPattern {
  id: string;
  user_id: string;
  content_vector?: number[];
  rating_vector?: number[];
  viewing_time_pattern?: Record<string, any>;
  genre_preferences?: Record<string, any>;
  total_viewing_time: number;
  total_videos_watched: number;
  average_completion_rate?: number;
  last_calculated: string;
  version: number;
}

export interface ViewingTrackingData {
  videoId: string;
  videoTitle?: string;
  channelName?: string;
  category?: string;
  viewingDuration?: number;
  videoLength?: number;
  completionRate?: number;
  userRating?: number;
}

export interface CommonVideo {
  video_id: string;
  video_title?: string;
  user1_rating?: number;
  user2_rating?: number;
  user1_completion?: number;
  user2_completion?: number;
}

export interface ViewingStats {
  total_videos: number;
  unique_categories: number;
  avg_completion_rate: number;
  avg_rating: number;
  total_viewing_time: number;
  last_viewing: string;
}
