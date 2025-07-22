// src/hooks/useViewingTracker.ts
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createViewingTracker } from '@/services/viewingTrackingService';

/**
 * YouTube 視聴トラッキング用カスタムフック
 *
 * 戻り値:
 * - startTracking  : 視聴開始を通知しタイマーを開始
 * - pauseTracking  : 一時停止（タイマー停止）
 * - resumeTracking : 再開（タイマー再開）
 * - stopTracking   : 視聴終了を通知しタイマーをクリア
 * - rateVideo      : 評価のみ送信
 * - isTracking     : 視聴中フラグ
 * - currentWatchTime: 視聴経過秒数
 */
export function useViewingTracker() {
  const { user } = useAuth();

  /** Supabase RPC をラップした tracker オブジェクト */
  const trackerRef = useRef<ReturnType<typeof createViewingTracker> | null>(
    null,
  );

  /** トラッキング対象動画のメタデータ */
  const videoMetaRef = useRef<{
    videoId: string;
    videoLength: number;
    category?: string;
  } | null>(null);

  /** 経過時間計測用 */
  const [currentWatchTime, setCurrentWatchTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ユーザーが変わるたびに tracker を再生成 */
  useEffect(() => {
    trackerRef.current = user?.id ? createViewingTracker(user.id) : null;
  }, [user?.id]);

  /** 内部: タイマー開始 */
  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setCurrentWatchTime((t) => t + 1);
    }, 1000);
  };

  /** 内部: タイマー停止 */
  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  /** 視聴開始 */
  const startTracking = (
    videoId: string,
    videoTitle?: string,
    channelName?: string,
    videoLength: number = 0,
    category?: string,
  ) => {
    if (!trackerRef.current) return;
    trackerRef.current.onVideoStart(videoId, videoTitle, channelName);
    videoMetaRef.current = { videoId, videoLength, category };
    setCurrentWatchTime(0);
    setIsTracking(true);
    startTimer();
  };

  /** 一時停止 */
  const pauseTracking = () => {
    if (!isTracking) return;
    stopTimer();
  };

  /** 再開 */
  const resumeTracking = () => {
    if (!isTracking) return;
    startTimer();
  };

  /** 視聴終了 */
  const stopTracking = async () => {
    if (!trackerRef.current || !videoMetaRef.current) return;
    const { videoId, videoLength, category } = videoMetaRef.current;
    await trackerRef.current.onVideoEnd(
      videoId,
      videoLength,
      category,
      undefined,
    );
    setIsTracking(false);
    stopTimer();
    videoMetaRef.current = null;
  };

  /** 評価のみ送信 */
  const rateVideo = async (rating: number) => {
    if (!trackerRef.current || !videoMetaRef.current) return false;
    await trackerRef.current.onVideoRating(
      videoMetaRef.current.videoId,
      rating,
    );
    return true;
  };

  /* アンマウント時にクリーンアップ */
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  return {
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    rateVideo,
    isTracking,
    currentWatchTime,
  };
}
