import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useVideoRating = (videoId?: string) => {
 const [averageRating, setAverageRating] = useState<number | null>(null);
 const [userRating, setUserRating] = useState<number | null>(null);
 const [reviewCount, setReviewCount] = useState<number>(0);
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
       // 平均評価の取得
       const { data: ratings, error: ratingsError } = await supabase
         .from('video_ratings')
         .select('overall')
         .eq('video_id', effectiveVideoId);
       
       if (ratingsError) throw ratingsError;
       
       if (ratings && ratings.length > 0) {
         const sum = ratings.reduce((acc, curr) => acc + curr.overall, 0);
         const avg = sum / ratings.length;
         setAverageRating(parseFloat(avg.toFixed(1)));
       } else {
         setAverageRating(null);
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
           .single();
         
         if (userRatingError && userRatingError.code !== 'PGRST116') {
           throw userRatingError;
         }
         
         setUserRating(userRatingData?.overall || null);
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
     const { data: existingRating, error: checkError } = await supabase
       .from('video_ratings')
       .select('id')
       .eq('video_id', effectiveVideoId)
       .eq('user_id', user.id)
       .single();
     
     if (checkError && checkError.code !== 'PGRST116') throw checkError;
     
     const ratingPayload = {
       ...ratingData,
       user_id: user.id,
       video_id: effectiveVideoId,
       updated_at: new Date().toISOString()
     };

     if (existingRating) {
       // 既存の評価を更新
       const { error: updateError } = await supabase
         .from('video_ratings')
         .update(ratingPayload)
         .eq('id', existingRating.id);
         
       if (updateError) throw updateError;
     } else {
       // 新しい評価を挿入
       const { error: insertError } = await supabase
         .from('video_ratings')
         .insert([ratingPayload]);
         
       if (insertError) throw insertError;
     }
     
     setUserRating(ratingData.overall);
     return true;
   } catch (err) {
     console.error('Error submitting rating:', err);
     setError('評価の送信中にエラーが発生しました');
     return false;
   }
 };

 return {
   averageRating,
   userRating,
   reviewCount,
   isLoading,
   error,
   submitRating
 };
};