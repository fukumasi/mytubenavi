// src/components/layout/NotificationSound.tsx
import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationSoundProps {
  volume?: number; // 0.0 から 1.0
  enabled?: boolean;
}

export default function NotificationSound({ 
  volume = 0.5, 
  enabled = true 
}: NotificationSoundProps) {
  const { notifications, unreadCount } = useNotifications();
  const { isPremium } = useAuth();
  const prevCountRef = useRef(notifications.length);
  const prevUnreadRef = useRef(unreadCount);
  
  // 各種通知音のキャッシュ用Ref
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  
  const [isSupported, setIsSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(enabled);
  
  // 再生履歴（短時間での重複再生を防止）
  const playHistoryRef = useRef<Array<{id: string, time: number}>>([]);

  // 設定の読み込み
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('notificationSound');
      if (savedSettings) {
        const { enabled: savedEnabled, volume: savedVolume } = JSON.parse(savedSettings);
        if (typeof savedEnabled === 'boolean') {
          setSoundEnabled(savedEnabled);
        }
        
        // すべての音声ファイルのボリューム設定
        if (typeof savedVolume === 'number') {
          const validVolume = Math.min(Math.max(savedVolume, 0), 1);
          Object.values(audioRefs.current).forEach(audio => {
            audio.volume = validVolume;
          });
        }
      }
    } catch (err) {
      console.error('通知音設定の読み込みに失敗:', err);
    }
  }, []);

  // 基本的な通知音のプリロード
  useEffect(() => {
    try {
      // 基本通知音
      const basicSound = new Audio('/sounds/notification.mp3');
      basicSound.volume = Math.min(Math.max(volume, 0), 1);
      basicSound.addEventListener('ended', () => setIsPlaying(false));
      audioRefs.current['default'] = basicSound;
      
      // 重要通知音
      try {
        const importantSound = new Audio('/sounds/important-notification.mp3');
        importantSound.volume = Math.min(Math.max(volume, 0), 1);
        importantSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['important'] = importantSound;
      } catch (e) {
        audioRefs.current['important'] = basicSound;
      }
      
      // プレミアム通知音
      try {
        const premiumSound = new Audio('/sounds/premium-notification.mp3');
        premiumSound.volume = Math.min(Math.max(volume, 0), 1);
        premiumSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['premium'] = premiumSound;
      } catch (e) {
        audioRefs.current['premium'] = basicSound;
      }
      
      // 実績通知音
      try {
        const achievementSound = new Audio('/sounds/achievement.mp3');
        achievementSound.volume = Math.min(Math.max(volume, 0), 1);
        achievementSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['achievement'] = achievementSound;
      } catch (e) {
        audioRefs.current['achievement'] = basicSound;
      }
      
      // プレミアム特別通知音
      try {
        const premiumSpecialSound = new Audio('/sounds/premium-special.mp3');
        premiumSpecialSound.volume = Math.min(Math.max(volume, 0), 1);
        premiumSpecialSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['premium-special'] = premiumSpecialSound;
      } catch (e) {
        audioRefs.current['premium-special'] = audioRefs.current['premium'] || basicSound;
      }
    } catch (err) {
      console.error('Audio APIがサポートされていません:', err);
      setIsSupported(false);
    }

    return () => {
      // クリーンアップ
      Object.values(audioRefs.current).forEach(audio => {
        audio.removeEventListener('ended', () => setIsPlaying(false));
        audio.pause();
      });
      audioRefs.current = {};
    };
  }, [volume]);

  // 新規通知の検知と音声再生
  useEffect(() => {
    if (!soundEnabled || !isSupported || isPlaying) return;

    const hasNewNotification = notifications.length > prevCountRef.current;
    const hasNewUnread = unreadCount > prevUnreadRef.current;
    
    // 最新の通知を取得（配列の最初の要素 - 新しい順にソートされている想定）
    const latestNotification = notifications.length > 0 ? notifications[0] : null;
    
    // プレミアム会員は全ての新規通知で音を鳴らし、非プレミアム会員は一部の重要な通知のみ
    const shouldPlaySound = isPremium 
      ? (hasNewNotification || hasNewUnread)
      : hasNewNotification && latestNotification && 
        (latestNotification.priority === 'high' || 
         latestNotification.type === 'achievement' ||
         latestNotification.type === 'system');

    if (shouldPlaySound && latestNotification) {
      // 最近同じ通知IDの音が鳴っていないか確認（5秒以内の重複を防止）
      const now = Date.now();
      const recentPlay = playHistoryRef.current.find(
        h => h.id === latestNotification.id && now - h.time < 5000
      );
      
      if (!recentPlay) {
        setIsPlaying(true);
        
        // 通知タイプに応じた音声ファイルを選択
        const soundType = latestNotification.is_premium_only || 
                         (latestNotification.message && latestNotification.message.includes('プレミアム'))
          ? 'premium-special'
          : latestNotification.priority === 'high'
            ? 'important'
            : latestNotification.type === 'achievement'
              ? 'achievement'
              : isPremium
                ? 'premium'
                : 'default';
        
        const soundToPlay = audioRefs.current[soundType] || audioRefs.current['default'];
        
        if (soundToPlay) {
          soundToPlay.currentTime = 0;
          soundToPlay.play().catch(err => {
            console.error('通知音の再生に失敗:', err);
            setIsPlaying(false);
            // ブラウザのポリシーで自動再生が拒否された可能性があるため、完全にサポート外とは判断しない
            if (err.name !== 'NotAllowedError') {
              setIsSupported(false);
            }
          });
          
          // 再生履歴に追加
          playHistoryRef.current.push({ id: latestNotification.id, time: now });
          // 履歴が大きくなりすぎないように古いものを削除
          if (playHistoryRef.current.length > 20) {
            playHistoryRef.current = playHistoryRef.current.slice(-10);
          }
        }
      }
    }

    prevCountRef.current = notifications.length;
    prevUnreadRef.current = unreadCount;
  }, [notifications, unreadCount, soundEnabled, isSupported, isPlaying, isPremium]);

  // リアルタイム通知イベントのリスナー設定
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent<{notification: any, isPremium: boolean}>) => {
      if (!soundEnabled || !isSupported || isPlaying) return;
      
      const { notification, isPremium: isUserPremium } = event.detail;
      
      // 既に再生履歴にあるか確認
      const now = Date.now();
      const recentPlay = playHistoryRef.current.find(
        h => h.id === notification.id && now - h.time < 5000
      );
      
      if (!recentPlay) {
        setIsPlaying(true);
        
        // 通知の優先度や種類に応じた音声を選択
        let soundKey = 'default';
        
        if (notification.is_premium_only || 
           (notification.message && notification.message.includes('プレミアム'))) {
          soundKey = 'premium-special';
        } else if (notification.priority === 'high') {
          soundKey = 'important';
        } else if (notification.type === 'achievement') {
          soundKey = 'achievement';
        } else if (isUserPremium) {
          soundKey = 'premium';
        }
        
        const soundToPlay = audioRefs.current[soundKey] || audioRefs.current['default'];
        
        if (soundToPlay) {
          soundToPlay.currentTime = 0;
          soundToPlay.play().catch(err => {
            console.error('通知音の再生に失敗:', err);
            setIsPlaying(false);
          });
          
          // 再生履歴に追加
          playHistoryRef.current.push({ id: notification.id, time: now });
          if (playHistoryRef.current.length > 20) {
            playHistoryRef.current = playHistoryRef.current.slice(-10);
          }
        }
      }
    };

    // カスタムイベントリスナーを追加
    window.addEventListener('newNotification', handleNewNotification as EventListener);
    
    return () => {
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [soundEnabled, isSupported, isPlaying]);

  // 設定の永続化
  useEffect(() => {
    try {
      localStorage.setItem('notificationSound', JSON.stringify({
        enabled: soundEnabled,
        volume,
        lastUpdated: new Date().toISOString()
      }));
    } catch (err) {
      console.error('通知音設定の保存に失敗:', err);
    }
  }, [soundEnabled, volume]);

  // ブラウザのautoplay制限対策
  useEffect(() => {
    const handleInteraction = () => {
      // ユーザーインタラクション時に一度各音声をロード
      Object.values(audioRefs.current).forEach(audio => {
        audio.load();
      });
      
      try {
        // 無音を再生してブラウザのオーディオコンテキストを有効化
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = context.createBufferSource();
        source.connect(context.destination);
        source.start(0);
        source.stop(0.001);
      } catch (err) {
        console.error('AudioContext API is not supported:', err);
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  // ユーザーの設定変更ハンドラを公開
  useEffect(() => {
    // 通知音設定の変更を外部から行えるようにするためのイベント
    const handleSoundSettingChange = (event: CustomEvent<{enabled?: boolean, volume?: number}>) => {
      const { enabled: newEnabled, volume: newVolume } = event.detail;
      
      if (typeof newEnabled === 'boolean') {
        setSoundEnabled(newEnabled);
      }
      
      if (typeof newVolume === 'number') {
        const validVolume = Math.min(Math.max(newVolume, 0), 1);
        Object.values(audioRefs.current).forEach(audio => {
          audio.volume = validVolume;
        });
      }
    };
    
    window.addEventListener('notificationSoundSettings', handleSoundSettingChange as EventListener);
    
    return () => {
      window.removeEventListener('notificationSoundSettings', handleSoundSettingChange as EventListener);
    };
  }, []);

  // このコンポーネントは何も表示しない
  return null;
}