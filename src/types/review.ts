// src/types/review.ts
export interface Review {
  id: string;
  created_at: string;
  updated_at?: string;
  video_id: string;
  user_id: string;
  content?: string;  // 追加
  comment?: string;
  parent_id?: string;
  likes_count?: number;
  review_count?: number;
  rating: number;
  type?: string;  // 追加: 'video_reviews' | 'video_ratings'
  profiles?: {
    id: string;
    username: string;
    avatar_url: string;
  };
  videos?: {
    title: string;
    thumbnail: string;
  };
  child_reviews?: Review[];
  child_reviews_count?: number;
}