// src/components/video/VideoPlayer.tsx
import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { useViewingTracker } from '@/hooks/useViewingTracker';
import { motion, AnimatePresence } from 'framer-motion';

export interface VideoPlayerProps {
  videoId: string;
  videoTitle?: string;
  channelName?: string;
  category?: string;
  /** デフォルト: 100% */
  width?: string | number;
  /** デフォルト: 315px (YouTube 公式の最小高) */
  height?: string | number;
  autoPlay?: boolean;
  onRatingChange?: (rating: number) => void;
}

export default function VideoPlayer({
  videoId,
  videoTitle,
  channelName,
  category,
  width = '100%',
  height = 315,
  autoPlay = false,
  onRatingChange,
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showRating, setShowRating] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);

  const {
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    rateVideo,
    isTracking,
    currentWatchTime,
  } = useViewingTracker();

  /* ---------- YouTube Player API 読み込み ---------- */
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if ((window as any).YT) {
        initializePlayer();
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = initializePlayer;
    };

    const initializePlayer = () => {
      if (!playerRef.current) return;

      const newPlayer = new (window as any).YT.Player(playerRef.current, {
        width,
        height,
        videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          fs: 1,
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            setDuration(event.target.getDuration());
          },
          onStateChange: (event: any) => {
            switch (event.data) {
              case (window as any).YT.PlayerState.PLAYING:
                setIsPlaying(true);
                if (!isTracking) {
                  startTracking(
                    videoId,
                    videoTitle,
                    channelName,
                    event.target.getDuration(),
                    category,
                  );
                } else {
                  resumeTracking();
                }
                break;

              case (window as any).YT.PlayerState.PAUSED:
                setIsPlaying(false);
                pauseTracking();
                break;

              case (window as any).YT.PlayerState.ENDED:
                setIsPlaying(false);
                stopTracking();
                setShowRating(true);
                break;
            }
          },
        },
      });

      setPlayer(newPlayer);
    };

    loadYouTubeAPI();

    return () => {
      if (isTracking) stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  /* ---------- 現在位置の更新 ---------- */
  useEffect(() => {
    if (!player || !isPlaying) return;
    const id = setInterval(() => setCurrentTime(player.getCurrentTime()), 1000);
    return () => clearInterval(id);
  }, [player, isPlaying]);

  /* ---------- 評価送信 ---------- */
  const handleRating = async (rating: number) => {
    setUserRating(rating);
    const ok = await rateVideo(rating);
    if (ok) {
      setShowRating(false);
      onRatingChange?.(rating);
    }
  };

  /* ---------- 進捗バー ---------- */
  const progress = duration ? (currentTime / duration) * 100 : 0;

  /* ---------- JSX ---------- */
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* YouTube Player */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <div ref={playerRef} className="w-full h-full" />

        {/* トラッキングインジケーター */}
        {isTracking && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>
              視聴中:{' '}
              {Math.floor(currentWatchTime / 60)}:
              {(currentWatchTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* 動画情報 */}
      <div className="mt-4 space-y-1">
        <h2 className="text-xl font-bold">{videoTitle ?? 'タイトル未取得'}</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span>📺 {channelName ?? 'チャンネル未取得'}</span>
          {category && <span>🏷️ {category}</span>}
          <span>
            ⏱️ 視聴時間:{' '}
            {Math.floor(currentWatchTime / 60)}分{currentWatchTime % 60}秒
          </span>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mt-3">
        <div className="w-full h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-red-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>
            {Math.floor(currentTime / 60)}:
            {Math.floor(currentTime % 60).toString().padStart(2, '0')}
          </span>
          <span>
            {Math.floor(duration / 60)}:
            {Math.floor(duration % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* 評価モーダル */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRating(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-md mx-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-center mb-2">動画の評価</h3>
              <p className="text-gray-600 text-center mb-6">
                この動画はいかがでしたか？
              </p>

              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 rounded-full ${
                      userRating >= n
                        ? 'text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                    onClick={() => handleRating(n)}
                  >
                    <Star
                      size={32}
                      fill={userRating >= n ? 'currentColor' : 'none'}
                    />
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  onClick={() => setShowRating(false)}
                >
                  スキップ
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  onClick={() => userRating && handleRating(userRating)}
                  disabled={!userRating}
                >
                  評価する
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
