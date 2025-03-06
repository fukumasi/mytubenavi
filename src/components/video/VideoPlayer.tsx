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

 const recordViewHistory = async (youtubeId: string) => {
   if (!user) {
     console.log('ユーザーが認証されていません');
     return;
   }
   try {
     // まず、YouTubeのIDから内部IDを取得
     const { data: videoData, error: videoError } = await supabase
       .from('videos')
       .select('id')
       .eq('youtube_id', youtubeId)
       .maybeSingle();
     
     if (videoError) {
       console.error('動画IDの取得に失敗:', videoError);
       return;
     }
     
     if (!videoData) {
       console.error('動画が見つかりません:', youtubeId);
       return;
     }
     
     const internalVideoId = videoData.id;
     
     // 既存のレコードを確認
     const { data: existingRecord, error: checkError } = await supabase
       .from('view_history')
       .select('id')
       .eq('user_id', user.id)
       .eq('video_id', internalVideoId)
       .maybeSingle();
    
     if (checkError) {
       console.error('視聴履歴の確認に失敗:', checkError);
       return;
     }
    
     if (existingRecord) {
       // 既存のレコードを更新
       const { error: updateError } = await supabase
         .from('view_history')
         .update({
           viewed_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         })
         .eq('id', existingRecord.id);
      
       if (updateError) {
         console.error('視聴履歴の更新に失敗:', updateError);
       } else {
         console.log('視聴履歴を更新しました');
       }
     } else {
       // 新しいレコードを挿入
       const { error: insertError } = await supabase
         .from('view_history')
         .insert({
           user_id: user.id,
           video_id: internalVideoId,
           viewed_at: new Date().toISOString(),
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         });
      
       if (insertError) {
         console.error('視聴履歴の挿入に失敗:', insertError);
       } else {
         console.log('視聴履歴を追加しました');
       }
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
        playsinline: 1
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
 }, [videoId, width, height, onError, onReady, onStateChange, user]);

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