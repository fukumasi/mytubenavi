// src/components/video/VideoPlayer.tsx
import React, { useEffect, useRef } from 'react';
import { YouTubeEvent } from '../../lib/youtube';

interface VideoPlayerProps {
 videoId: string;
 width?: string | number;
 height?: string | number;
 onError?: (event: YouTubeEvent) => void;
}

declare global {
 interface Window {
   onYouTubeIframeAPIReady?: () => void;
 }
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
 videoId,
 width = '100%',
 height = '100%',
 onError
}) => {
 const playerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
   if (!videoId) return;

   const loadYouTubeAPI = () => {
     const tag = document.createElement('script');
     tag.src = 'https://www.youtube.com/iframe_api';
     const firstScriptTag = document.getElementsByTagName('script')[0];
     firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
   };

   window.onYouTubeIframeAPIReady = () => {
     if (!playerRef.current) return;

     new (window as any).YT.Player(playerRef.current, {
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
         onReady: () => {
           console.log('YouTube Player ready');
         },
         onStateChange: (event: YouTubeEvent) => {
           if (!(window as any).YT?.PlayerState) return;
           
           switch (event.data) {
             case (window as any).YT.PlayerState.PLAYING:
               console.log('Video started playing');
               break;
             case (window as any).YT.PlayerState.PAUSED:
               console.log('Video paused');
               break;
             case (window as any).YT.PlayerState.ENDED:
               console.log('Video ended');
               break;
           }
         },
         onError: (event: YouTubeEvent) => {
           console.error('YouTube Player error:', event.data);
           onError?.(event);
         }
       }
     });
   };

   if ((window as any).YT) {
     window.onYouTubeIframeAPIReady();
   } else {
     loadYouTubeAPI();
   }

   return () => {
     if (playerRef.current) {
       playerRef.current.innerHTML = '';
     }
     window.onYouTubeIframeAPIReady = () => {};
   };
 }, [videoId, width, height, onError]);

 return (
   <div className="video-player-container w-full h-full">
     <div 
       ref={playerRef} 
       id={`youtube-player-${videoId}`}
       className="video-player w-full h-full"
     />
   </div>
 );
};

export default VideoPlayer;