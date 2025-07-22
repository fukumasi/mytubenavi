// src/services/viewingTrackingService.ts
import { supabase } from '@/lib/supabase';
import type {
  ViewingTrackingData,
  ViewingHistory,
  CommonVideo,
  ViewingStats,
} from '@/types/viewing';

/* ------------------------------------------------------------------ */
/*                      視聴データの書き込み RPC                        */
/* ------------------------------------------------------------------ */
export const trackVideoViewing = async (
  userId: string,
  viewingData: ViewingTrackingData,
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('track_video_viewing', {
      p_user_id: userId,
      p_video_id: viewingData.videoId,
      p_video_title: viewingData.videoTitle,
      p_channel_name: viewingData.channelName,
      p_category: viewingData.category,
      p_viewing_duration: viewingData.viewingDuration,
      p_video_length: viewingData.videoLength,
      p_completion_rate: viewingData.completionRate,
      p_user_rating: viewingData.userRating,
    });

    if (error) {
      console.error('視聴データ記録エラー:', error);
      return null;
    }

    console.log('視聴データ記録成功:', viewingData.videoId);
    return data;
  } catch (err) {
    console.error('視聴データ記録例外:', err);
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*                           視聴履歴の取得                             */
/* ------------------------------------------------------------------ */
export const getUserViewingHistory = async (
  userId: string,
  limit = 50,
): Promise<ViewingHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('viewing_history')
      .select('*')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('視聴履歴取得エラー:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('視聴履歴取得例外:', err);
    return [];
  }
};

/* ------------------------------------------------------------------ */
/*                        共通視聴動画の取得                            */
/* ------------------------------------------------------------------ */
export const getCommonVideos = async (
  userId1: string,
  userId2: string,
  limit = 20,
): Promise<CommonVideo[]> => {
  try {
    const { data, error } = await supabase.rpc('get_common_videos', {
      p_user_id_1: userId1,
      p_user_id_2: userId2,
      p_limit: limit,
    });

    if (error) {
      console.error('共通動画取得エラー:', error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('共通動画取得例外:', err);
    return [];
  }
};

/* ------------------------------------------------------------------ */
/*                         視聴統計の取得                               */
/* ------------------------------------------------------------------ */
export const getUserViewingStats = async (
  userId: string,
): Promise<ViewingStats | null> => {
  try {
    const { data, error } = await supabase
      .from('user_viewing_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('視聴統計取得エラー:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('視聴統計取得例外:', err);
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*                      フロント側トラッカー生成                        */
/* ------------------------------------------------------------------ */
export const createViewingTracker = (userId: string) => {
  return {
    /** 動画再生開始 */
    onVideoStart: (
      videoId: string,
      _videoTitle?: string, // 使わないので頭に _ を付けて未使用警告を防止
      _channelName?: string, // 同上
    ) => {
      console.log('動画視聴開始:', videoId);
      localStorage.setItem(`video_start_${videoId}`, Date.now().toString());
    },

    /** 動画再生終了 */
    onVideoEnd: async (
      videoId: string,
      videoLength: number,
      category?: string,
      rating?: number,
    ) => {
      const startTime = localStorage.getItem(`video_start_${videoId}`);
      if (!startTime) return;

      const viewingDurationMs = Date.now() - parseInt(startTime, 10);
      const completionRate = Math.min(
        1,
        viewingDurationMs / (videoLength * 1000),
      );

      const trackingData: ViewingTrackingData = {
        videoId,
        category,
        viewingDuration: Math.floor(viewingDurationMs / 1000), // 秒
        videoLength,
        completionRate,
        userRating: rating,
      };

      await trackVideoViewing(userId, trackingData);
      localStorage.removeItem(`video_start_${videoId}`);
    },

    /** 動画評価 */
    onVideoRating: async (videoId: string, rating: number) => {
      const trackingData: ViewingTrackingData = {
        videoId,
        userRating: rating,
      };
      await trackVideoViewing(userId, trackingData);
    },
  };
};
