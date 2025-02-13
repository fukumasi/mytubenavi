// src/components/video/VideoPlayer.tsx
import React, { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface VideoPlayerProps {
  videoId: string;
  width?: string | number;
  height?: string | number;
  onError?: (event: { data: number }) => void;
  onReady?: () => void;
  onStateChange?: (event: { data: number }) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  width = '100%',
  height = '100%',
  onError,
  onReady,
  onStateChange
}) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const { user } = useAuth();

  // 視聴履歴を記録する関数（統合版）
  const recordViewHistory = async (videoId: string) => {
      if (!user) {
          console.log('ユーザーが認証されていません');
          return;
      }
      try {
          const { error } = await supabase
              .from('view_history')
              .upsert(
                  {
                      user_id: user.id,
                      video_id: videoId,
                      viewed_at: new Date().toISOString(),
                  },
                  {
                      onConflict: 'user_id,video_id',
                  }
              );

          if (error) {
              console.error('視聴履歴の記録に失敗:', error);
          }
      } catch (error) {
          console.error('視聴履歴の記録に失敗:', error);
      }
  };

  useEffect(() => {
    if (!videoId) return;

    const loadYouTubeAPI = () => {
      if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    };

    const initializePlayer = () => {
      if (!playerRef.current) return;

      playerInstanceRef.current = new window.YT!.Player(playerRef.current, {
        videoId,
        width,
        height,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          controls: 1,
          enablejsapi: 1
        },
        events: {
          onReady,
          onStateChange: (event: { data: number }) => {
            if (!window.YT?.PlayerState) return;
            
            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                console.log('Video started playing');
                recordViewHistory(videoId);
                break;
              case window.YT.PlayerState.PAUSED:
                console.log('Video paused');
                break;
              case window.YT.PlayerState.ENDED:
                console.log('Video ended');
                break;
            }
            onStateChange?.(event);
          },
          onError: (event: { data: number }) => {
            console.error('YouTube Player error:', event.data);
            onError?.(event);
          }
        }
      });
    };

    window.onYouTubeIframeAPIReady = initializePlayer;

    if (window.YT) {
      initializePlayer();
    } else {
      loadYouTubeAPI();
    }

    return () => {
      if (playerInstanceRef.current?.destroy) {
        playerInstanceRef.current.destroy();
      }
      playerInstanceRef.current = null;
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [videoId, width, height, onError, onReady, onStateChange, user]); // 依存配列にuserを追加

  return (
    <div className="relative pt-[56.25%]">
      <div 
        ref={playerRef} 
        id={`youtube-player-${videoId}`}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};

export default VideoPlayer;