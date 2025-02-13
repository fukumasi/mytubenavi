export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface Comment extends BaseEntity {
  video_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  likes_count: number;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string;
  };
  videos?: {
    title: string;
    thumbnail: string;
  };
  replies?: Comment[];
  replies_count: number;
}