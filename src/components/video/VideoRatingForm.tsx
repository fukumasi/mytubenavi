import React, { useState, useMemo, useEffect } from 'react';
import { VideoRating, RatingCategory, RatingValue } from '@/types';
import { submitVideoRating, updateVideoReviewCount, getLatestReviewId } from '@/lib/supabase';
import { StarRating } from '../search/review/StarRating';
import { HelpCircle, AlertCircle, Award } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';

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

const ALL_CATEGORIES: RatingCategory[] = [
 'reliability', 'entertainment', 'usefulness', 
 'quality', 'originality', 'clarity', 'overall'
];

interface VideoRatingFormProps {
 videoId: string;
 onSubmit: () => Promise<void>;
 initialRatings?: Partial<VideoRating>;
 className?: string;
 showReset?: boolean;
}

export default function VideoRatingForm({
 videoId,
 onSubmit,
 initialRatings = {},
 className = "",
 showReset = true
}: VideoRatingFormProps) {
 // ポイント関連のフック追加
 const { processReviewReward, isPremium } = usePoints();
 
 const defaultRatings = useMemo<Record<RatingCategory, RatingValue>>(() => ({
   reliability: 1 as RatingValue,
   entertainment: 1 as RatingValue,
   usefulness: 1 as RatingValue,
   quality: 1 as RatingValue,
   originality: 1 as RatingValue,
   clarity: 1 as RatingValue,
   overall: 1 as RatingValue
 }), []);

 const [ratings, setRatings] = useState<Record<RatingCategory, RatingValue>>(() => ({
   ...defaultRatings,
   ...Object.fromEntries(
     Object.entries(initialRatings).map(([key, value]) => 
       [key, (value as RatingValue | undefined) ?? defaultRatings[key as RatingCategory]]
     )
   )
 }));

 const [comment, setComment] = useState(initialRatings?.comment || '');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [tooltipCategory, setTooltipCategory] = useState<RatingCategory | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<boolean>(false);
 // ポイント獲得表示用の状態追加
 const [earnedPoints, setEarnedPoints] = useState<number | null>(null);

 // オブジェクト比較用の文字列化
 const initialRatingsString = useMemo(() => 
   JSON.stringify(initialRatings),
 [initialRatings]);

 // 初期値が変更された場合、フォームをリセット
 useEffect(() => {
   const newInitialRatings = {
     ...defaultRatings,
     ...Object.fromEntries(
       Object.entries(initialRatings).map(([key, value]) => 
         [key, (value as RatingValue | undefined) ?? defaultRatings[key as RatingCategory]]
       )
     )
   };
   
   setRatings(newInitialRatings);
   setComment(initialRatings?.comment || '');
   setError(null);
   setSuccess(false);
   setEarnedPoints(null);
 }, [initialRatingsString, defaultRatings]);

 // デバッグ用
 useEffect(() => {
   console.log('Ratings state changed:', ratings);
   console.log('Comment state changed:', comment);
 }, [ratings, comment]);

 const handleRatingChange = (category: RatingCategory, value: RatingValue) => {
   setRatings(prev => {
     const newRatings = {
       ...prev,
       [category]: value
     };
     
     if (category !== 'overall') {
       const nonOverallCategories: RatingCategory[] = [
         'reliability', 'entertainment', 'usefulness', 
         'quality', 'originality', 'clarity'
       ];
       const averageRating = nonOverallCategories.reduce((sum, cat) => 
         sum + newRatings[cat], 0) / nonOverallCategories.length;
       
       newRatings.overall = Math.round(averageRating) as RatingValue;
     }
     
     return newRatings;
   });
   
   // エラーが表示されていた場合はクリア
   if (error) setError(null);
 };

 const resetForm = () => {
   console.log('Resetting form...'); // Debug log
   setRatings({...defaultRatings});
   setComment('');
   setError(null);
   setSuccess(false);
   setEarnedPoints(null);
 };

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   if (isSubmitting) return;

   try {
     setIsSubmitting(true);
     setError(null);
     
     console.log('Submitting ratings:', ratings);
     console.log('Submitting comment:', comment);
     
     // レビューデータを送信
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

     // ビデオレビュー数を更新
     await updateVideoReviewCount(videoId);
     
     // 最新のレビューIDを取得（ポイント付与用）
     const reviewId = await getLatestReviewId(videoId);
     console.log('レビューID取得:', reviewId);
     
     // ポイント付与処理（reviewIdが取得できた場合のみ）
     if (reviewId && comment) {
       try {
         console.log('ポイント処理を開始します');
         const points = await processReviewReward(comment, reviewId);
         console.log(`ポイント付与結果: ${points}ポイント`);
         
         if (points > 0) {
           setEarnedPoints(points);
         }
       } catch (pointsError) {
         console.error('ポイント付与エラー:', pointsError);
         // ポイント処理に失敗してもレビュー自体は成功とする
       }
     } else {
       console.warn('レビューIDが取得できないか、コメントがないためポイント付与をスキップします');
     }
     
     setSuccess(true);
     
     // 成功メッセージを5秒後に消す（ポイント表示のため少し長めに）
     setTimeout(() => {
       setSuccess(false);
       setEarnedPoints(null);
     }, 5000);
     
     resetForm();
     console.log('Form reset, calling onSubmit');
     await onSubmit();
   } catch (error) {
     console.error('Rating submission failed:', error);
     setError('評価の送信に失敗しました。後でもう一度お試しください。');
   } finally {
     setIsSubmitting(false);
   }
 };

 const renderRatingItem = (category: RatingCategory) => {
   const isOverall = category === 'overall';
   return (
     <div key={category} className={`
       flex items-center justify-between py-2 relative
       ${isOverall ? 'mt-4 pt-4 border-t border-gray-200 dark:border-dark-border' : ''}
     `}>
       <div className="flex items-center space-x-2">
         <span className={`min-w-[5rem] text-gray-700 dark:text-dark-text-primary ${
           isOverall ? 'text-base font-semibold' : 'text-sm'
         }`}>
           {RATING_CATEGORY_LABELS[category]}
         </span>
         <div 
           onMouseEnter={() => setTooltipCategory(category)}
           onMouseLeave={() => setTooltipCategory(null)}
           className="relative"
           aria-label={`${RATING_CATEGORY_LABELS[category]}の説明`}
         >
           <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help" />
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
         aria-label={`${RATING_CATEGORY_LABELS[category]}の評価`}
       />
     </div>
   );
 };

 const mainCategories = ALL_CATEGORIES.filter(category => category !== 'overall');
 const leftColumns = mainCategories.slice(0, Math.ceil(mainCategories.length / 2));
 const rightColumns = mainCategories.slice(Math.ceil(mainCategories.length / 2));

 return (
   <form onSubmit={handleSubmit} className={`bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border ${className}`}>
     <div className="p-4">
       {error && (
         <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start">
           <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
           <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
         </div>
       )}
       
       {success && (
         <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
           <p className="text-sm text-green-600 dark:text-green-400">評価を送信しました。ありがとうございます！</p>
         </div>
       )}
       
       {/* ポイント獲得表示の追加 */}
       {earnedPoints && earnedPoints > 0 && (
         <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex items-center">
           <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
           <p className="text-sm text-yellow-700 dark:text-yellow-400">レビュー投稿で{earnedPoints}ポイント獲得しました！</p>
         </div>
       )}
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
           {leftColumns.map(category => renderRatingItem(category))}
         </div>
         <div>
           {rightColumns.map(category => renderRatingItem(category))}
         </div>
       </div>
       
       {renderRatingItem('overall')}
       
       <div className="mt-4">
         <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
           口コミコメント
           {isPremium && (
             <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">（プレミアム会員はポイント2倍！）</span>
           )}
         </label>
         <textarea
           id="review-comment"
           rows={4}
           value={comment}
           onChange={(e) => setComment(e.target.value)}
           placeholder="この動画について詳しく教えてください（100文字以上でボーナスポイント！）"
           className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-dark-text-primary"
           aria-label="口コミコメント"
         />
         <div className="mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">
           コメントを書くとポイントがもらえます！ 100文字以上で追加ポイント獲得！
         </div>
       </div>
     </div>
     
     <div className="px-4 py-3 bg-gray-50 dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border rounded-b-lg flex justify-between">
       {showReset && (
         <button
           type="button"
           onClick={resetForm}
           disabled={isSubmitting}
           className="text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary font-medium py-2 px-4 rounded-md transition-colors text-sm"
         >
           リセット
         </button>
       )}
       
       <button
         type="submit"
         disabled={isSubmitting}
         className={`${showReset ? '' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md 
           disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm`}
       >
         {isSubmitting ? '送信中...' : '評価を送信'}
       </button>
     </div>
   </form>
 );
}