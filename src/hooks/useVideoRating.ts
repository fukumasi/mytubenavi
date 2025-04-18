import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RatingCategory } from '@/types';

// 詳細評価のインターフェース
interface DetailedRatings {
 overall: number;
 clarity: number;
 entertainment: number;
 originality: number;
 quality: number;
 reliability: number;
 usefulness: number;
}

export const useVideoRating = (videoId?: string) => {
 const [averageRating, setAverageRating] = useState<number | null>(null);
 const [userRating, setUserRating] = useState<number | null>(null);
 const [reviewCount, setReviewCount] = useState<number>(0);
 const [detailedRatings, setDetailedRatings] = useState<DetailedRatings | null>(null);
 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);
 const { user } = useAuth();
 
 const { id: urlVideoId } = useParams<{ id: string }>();
 const effectiveVideoId = videoId || urlVideoId;

 useEffect(() => {
   if (!effectiveVideoId) {
     setIsLoading(false);
     return;
   }

   const fetchRatings = async () => {
     setIsLoading(true);
     setError(null);
     
     try {
       // 全ての評価を取得して詳細データを計算
       const { data: ratings, error: ratingsError } = await supabase
         .from('video_ratings')
         .select('overall, clarity, entertainment, originality, quality, reliability, usefulness')
         .eq('video_id', effectiveVideoId);
       
       if (ratingsError) throw ratingsError;
       
       if (ratings && ratings.length > 0) {
         // 平均評価の計算
         const overall = ratings.reduce((acc, curr) => acc + curr.overall, 0) / ratings.length;
         setAverageRating(parseFloat(overall.toFixed(1)));
         
         // 詳細評価の計算
         const detailedAvg: DetailedRatings = {
           overall: parseFloat(overall.toFixed(1)),
           clarity: parseFloat((ratings.reduce((acc, curr) => acc + curr.clarity, 0) / ratings.length).toFixed(1)),
           entertainment: parseFloat((ratings.reduce((acc, curr) => acc + curr.entertainment, 0) / ratings.length).toFixed(1)),
           originality: parseFloat((ratings.reduce((acc, curr) => acc + curr.originality, 0) / ratings.length).toFixed(1)),
           quality: parseFloat((ratings.reduce((acc, curr) => acc + curr.quality, 0) / ratings.length).toFixed(1)),
           reliability: parseFloat((ratings.reduce((acc, curr) => acc + curr.reliability, 0) / ratings.length).toFixed(1)),
           usefulness: parseFloat((ratings.reduce((acc, curr) => acc + curr.usefulness, 0) / ratings.length).toFixed(1))
         };
         
         setDetailedRatings(detailedAvg);
       } else {
         setAverageRating(null);
         setDetailedRatings(null);
       }
       
       // レビュー数の取得
       const { count: reviewsCount, error: reviewsCountError } = await supabase
         .from('video_ratings')
         .select('id', { count: 'exact', head: true })
         .eq('video_id', effectiveVideoId);
       
       if (reviewsCountError) throw reviewsCountError;
       
       setReviewCount(reviewsCount || 0);
       
       // ログインユーザーの評価を取得
       if (user) {
         const { data: userRatingData, error: userRatingError } = await supabase
           .from('video_ratings')
           .select('overall')
           .eq('video_id', effectiveVideoId)
           .eq('user_id', user.id)
           .limit(1);
         
         if (userRatingError) {
           console.error('Error fetching user rating:', userRatingError);
           // エラーがあっても処理は続行
         } else if (userRatingData && userRatingData.length > 0) {
           setUserRating(userRatingData[0].overall || null);
         } else {
           setUserRating(null);
         }
       }
     } catch (err) {
       console.error('Error fetching video ratings:', err);
       setError('評価データの取得中にエラーが発生しました');
     } finally {
       setIsLoading(false);
     }
   };
   
   fetchRatings();
   
   // リアルタイムサブスクリプション
   const ratingsSubscription = supabase
     .channel('video_ratings-changes')
     .on('postgres_changes', 
       { 
         event: '*', 
         schema: 'public', 
         table: 'video_ratings',
         filter: `video_id=eq.${effectiveVideoId}`
       }, 
       () => {
         fetchRatings();
       }
     )
     .subscribe();
   
   return () => {
     ratingsSubscription.unsubscribe();
   };
 }, [effectiveVideoId, user]);

 // 評価を送信する関数
 const submitRating = async (ratingData: {
   overall: number;
   clarity: number;
   entertainment: number;
   originality: number;
   quality: number;
   reliability: number;
   usefulness: number;
   comment?: string;
 }) => {
   if (!effectiveVideoId || !user) {
     setError('評価するにはログインが必要です');
     return false;
   }

   try {
     // 既存の評価を確認
     const { data: existingRatingData, error: checkError } = await supabase
       .from('video_ratings')
       .select('id')
       .eq('video_id', effectiveVideoId)
       .eq('user_id', user.id)
       .limit(1);
     
     if (checkError) {
       console.error('Error checking existing rating:', checkError);
       throw checkError;
     }
     
     const existingRating = existingRatingData && existingRatingData.length > 0 ? existingRatingData[0] : null;
     
     const ratingPayload = {
       ...ratingData,
       user_id: user.id,
       video_id: effectiveVideoId,
       updated_at: new Date().toISOString()
     };

     if (existingRating) {
       console.log('Updating existing rating:', existingRating.id);
       // 既存の評価を更新
       const { error: updateError } = await supabase
         .from('video_ratings')
         .update(ratingPayload)
         .eq('id', existingRating.id);
         
       if (updateError) throw updateError;
     } else {
       console.log('Inserting new rating');
       // 新しい評価を挿入
       const { error: insertError } = await supabase
         .from('video_ratings')
         .insert([ratingPayload]);
         
       if (insertError) throw insertError;
     }
     
     setUserRating(ratingData.overall);
     
     // 詳細評価も更新
     // Note: 実際のデータが更新されるまでの一時的な表示用
     if (detailedRatings) {
       // 既存のデータがある場合は平均を更新
       // ここでは簡易的に新しい評価をそのまま表示
       setDetailedRatings({
         ...ratingData
       });
     } else {
       // 初めての評価の場合
       setDetailedRatings({
         ...ratingData
       });
     }
     
     return true;
   } catch (err) {
     console.error('Error submitting rating:', err);
     setError('評価の送信中にエラーが発生しました');
     return false;
   }
 };

 // カテゴリ別の評価を取得する便利関数
 const getCategoryRating = (category: RatingCategory): number => {
   if (!detailedRatings) return 0;
   return detailedRatings[category] || 0;
 };

 return {
   averageRating,
   userRating,
   reviewCount,
   detailedRatings,
   isLoading,
   error,
   submitRating,
   getCategoryRating
 };
};