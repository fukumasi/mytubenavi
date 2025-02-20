import React, { useState, useMemo } from 'react';
import { VideoRating, RatingCategory, RatingValue } from '@/types';
import { submitVideoRating } from '@/lib/supabase';
import { StarRating } from '../review/StarRating';
import { HelpCircle } from 'lucide-react';

const RATING_CATEGORY_LABELS: Record<RatingCategory, string> = {
  reliability: '信頼性',
  entertainment: '面白さ',
  usefulness: '有用性',
  quality: '品質',
  originality: 'オリジナリティ',
  clarity: '分かりやすさ',
  overall: '総合評価'
};

const RATING_CATEGORY_DESCRIPTIONS: Record<RatingCategory, string> = {
  reliability: '情報の正確さや信頼性',
  entertainment: '視聴者を楽しませる要素',
  usefulness: '実践的な情報や知識の有用性',
  quality: '映像・音声・編集の技術的な品質',
  originality: '新しいアイデアや独自の視点',
  clarity: '内容の理解のしやすさ',
  overall: '動画全体の総合的な評価'
};

interface VideoRatingFormProps {
  videoId: string;
  onSubmit: () => Promise<void>;
  initialRatings?: Partial<VideoRating>;
}

export default function VideoRatingForm({
  videoId,
  onSubmit,
  initialRatings = {}
}: VideoRatingFormProps) {
  const defaultRatings = useMemo<Record<RatingCategory, RatingValue>>(() => ({
    reliability: 1 as RatingValue,
    entertainment: 1 as RatingValue,
    usefulness: 1 as RatingValue,
    quality: 1 as RatingValue,
    originality: 1 as RatingValue,
    clarity: 1 as RatingValue,
    overall: 1 as RatingValue
  }), []);

  const [ratings, setRatings] = useState<Record<RatingCategory, RatingValue>>(() => {
    return {
      ...defaultRatings,
      ...Object.fromEntries(
        Object.entries(initialRatings).map(([key, value]) => 
          [key, (value as RatingValue | undefined) ?? defaultRatings[key as RatingCategory]]
        )
      )
    };
  });

  const [comment, setComment] = useState(initialRatings?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tooltipCategory, setTooltipCategory] = useState<RatingCategory | null>(null);

  const handleRatingChange = (category: RatingCategory, value: RatingValue) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const resetForm = () => {
    setRatings(defaultRatings);
    setComment('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log('Submitted Comment:', comment);
      console.log('Rating submission data:', {
        videoId,
        ratings,
        comment
      });

      await submitVideoRating(
        videoId,
        ratings.overall,
        ratings.clarity,
        ratings.entertainment,
        ratings.originality,
        ratings.quality,
        ratings.reliability,
        ratings.usefulness,
        comment
      );

      // フォームをリセット
      resetForm();
      await onSubmit();
    } catch (error) {
      console.error('Rating submission failed:', error);
      alert('評価の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingItem = (category: RatingCategory) => {
    const isOverall = category === 'overall';
    return (
      <div key={category} className={`
        flex items-center justify-between py-2 relative
        ${isOverall ? 'mt-4 pt-4 border-t border-gray-200' : ''}
      `}>
        <div className="flex items-center space-x-2">
          <span className={`min-w-[5rem] text-gray-700 ${
            isOverall ? 'text-base font-semibold' : 'text-sm'
          }`}>
            {RATING_CATEGORY_LABELS[category]}
          </span>
          <div 
            onMouseEnter={() => setTooltipCategory(category)}
            onMouseLeave={() => setTooltipCategory(null)}
            className="relative"
          >
            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
            {tooltipCategory === category && (
              <div className="absolute z-10 left-full ml-2 w-48 p-2 bg-black text-white text-xs rounded shadow-lg">
                {RATING_CATEGORY_DESCRIPTIONS[category]}
              </div>
            )}
          </div>
        </div>
        <StarRating
          rating={ratings[category]}
          onRatingChange={(value) => handleRatingChange(category, value)}
          size={isOverall ? "md" : "sm"}
          showNumber
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">評価を投稿</h3>
        <div className="space-y-2">
          {Object.keys(ratings)
            .filter(category => category !== 'overall')
            .map(category => renderRatingItem(category as RatingCategory))}
          {renderRatingItem('overall')}
        </div>
        
        <div className="mt-4">
          <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-2">
            口コミコメント（任意）
          </label>
          <textarea
            id="review-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="この動画について詳しく教えてください（任意）"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md 
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isSubmitting ? '送信中...' : '評価を送信'}
        </button>
      </div>
    </form>
  );
}