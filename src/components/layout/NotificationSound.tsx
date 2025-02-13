// src/components/layout/NotificationSound.tsx
import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

interface NotificationSoundProps {
 volume?: number; // 0.0 から 1.0
 enabled?: boolean;
}

export default function NotificationSound({ 
 volume = 0.5, 
 enabled = true 
}: NotificationSoundProps) {
 const { notifications } = useNotifications();
 const prevCountRef = useRef(notifications.length);
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const [isSupported, setIsSupported] = useState(true);
 const [isPlaying, setIsPlaying] = useState(false);

 // Audio初期化
 useEffect(() => {
   try {
     audioRef.current = new Audio('/sounds/notification.mp3');
     audioRef.current.volume = Math.min(Math.max(volume, 0), 1);
     audioRef.current.addEventListener('ended', () => setIsPlaying(false));
   } catch (err) {
     console.error('Audio APIがサポートされていません:', err);
     setIsSupported(false);
   }

   return () => {
     if (audioRef.current) {
       audioRef.current.removeEventListener('ended', () => setIsPlaying(false));
       audioRef.current.pause();
       audioRef.current = null;
     }
   };
 }, [volume]);

 // 新規通知の検知と音声再生
 useEffect(() => {
   if (!enabled || !isSupported || isPlaying) return;

   const hasNewNotification = notifications.length > prevCountRef.current;
   const hasUnreadNotification = notifications.some(n => !n.isRead);

   if (hasNewNotification && hasUnreadNotification && audioRef.current) {
     setIsPlaying(true);
     audioRef.current.currentTime = 0;
     audioRef.current.play().catch(err => {
       console.error('通知音の再生に失敗:', err);
       setIsPlaying(false);
       setIsSupported(false);
     });
   }

   prevCountRef.current = notifications.length;
 }, [notifications, enabled, isSupported, isPlaying]);

 // 設定の永続化
 useEffect(() => {
   try {
     localStorage.setItem('notificationSound', JSON.stringify({
       enabled,
       volume,
       lastUpdated: new Date().toISOString()
     }));
   } catch (err) {
     console.error('通知音設定の保存に失敗:', err);
   }
 }, [enabled, volume]);

 // ブラウザのautoplay制限対策
 useEffect(() => {
   const handleInteraction = () => {
     if (audioRef.current) {
       audioRef.current.load();
     }
   };

   window.addEventListener('click', handleInteraction, { once: true });
   return () => window.removeEventListener('click', handleInteraction);
 }, []);

 return null;
}