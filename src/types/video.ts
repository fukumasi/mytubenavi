export interface Video {
  // 基本情報
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  youtube_id: string;
 
  // MyTubeNavi関連の評価・統計
  rating: number;
  avg_rating?: number;
  review_count?: number;
 
  // 動画統計
  view_count: number;
  like_count?: number;
 
  // メタデータ
  channel_id?: string;
  channel_title: string;
  published_at: string;
  genre_id?: string;
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
  ratings?: {
    reliability: AggregatedRating;
    entertainment: AggregatedRating;
    usefulness: AggregatedRating;
    quality: AggregatedRating;
    originality: AggregatedRating;
    clarity: AggregatedRating;
    overall: AggregatedRating;
  };
 }
 
 interface AggregatedRating {
  averageRating: number;
  totalRatings: number;
  distribution: {
    [key: number]: number;
  };
 }