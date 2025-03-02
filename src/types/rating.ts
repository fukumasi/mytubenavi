// src/types/rating.ts

export type RatingCategory = 
| 'reliability'
| 'entertainment'
| 'usefulness'
| 'quality'
| 'originality'
| 'clarity'
| 'overall';

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface RatingItem {
value: RatingValue;
timestamp: Date;
userId: string;
review?: string;
}

export interface AggregatedRating {
averageRating: number;
totalRatings: number;
distribution: {
  [K in RatingValue]: number;
};
}

export interface VideoRating {
overall: number;
clarity: number;
entertainment: number;
originality: number;
quality: number;
reliability: number;
usefulness: number;
comment: string;
}

export interface AggregatedVideoRating {
reliability: AggregatedRating;
entertainment: AggregatedRating;
usefulness: AggregatedRating;
quality: AggregatedRating;
originality: AggregatedRating;
clarity: AggregatedRating;
overall: AggregatedRating;
}

export interface VideoRatingResponse {
id: string;
video_id: string;
user_id: string;
overall: number;
clarity: number;
entertainment: number;
originality: number;
quality: number;
reliability: number;
usefulness: number;
comment: string;
created_at: string;
updated_at: string;
}

export const RATING_CATEGORY_LABELS: Record<RatingCategory, string> = {
reliability: '信頼性',
entertainment: '面白さ',
usefulness: '有用性',
quality: '品質',
originality: 'オリジナリティ',
clarity: '分かりやすさ',
overall: '総合評価'
};

export const RATING_CATEGORY_DESCRIPTIONS: Record<RatingCategory, string> = {
reliability: '情報の正確さや信頼性',
entertainment: '視聴者を楽しませる要素',
usefulness: '実践的な情報や知識の有用性',
quality: '映像・音声・編集の技術的な品質',
originality: '新しいアイデアや独自の視点',
clarity: '内容の理解のしやすさ',
overall: '動画全体の総合的な評価'
};