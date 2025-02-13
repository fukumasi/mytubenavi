// src/types/history.ts
export interface VideoHistory {
  id: string;
  user_id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  channel_title: string;
  viewed_at: string;
  duration: string;
  view_count: number;
  created_at?: string;
  updated_at?: string;
 }