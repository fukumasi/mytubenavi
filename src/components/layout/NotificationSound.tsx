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
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [soundLoadError, setSoundLoadError] = useState(false);
  
  // 再生履歴（短時間での重複再生を防止）
  const playHistoryRef = useRef<Array<{id: string, time: number}>>([]);
  
  // インタラクションがあったかどうか
  const hasInteractedRef = useRef(false);
  
  // 通知キュー（再生待ちの通知）
  const notificationQueueRef = useRef<Array<{
    id: string,
    soundType: string,
    timestamp: number
  }>>([]);

  // 設定の読み込み
  useEffect(() => {
    try {
      // ユーザーインタラクション状態をローカルストレージから復元
      const interactionStatus = localStorage.getItem('hasInteracted');
      if (interactionStatus === 'true') {
        hasInteractedRef.current = true;
        console.log('ユーザーインタラクション状態を復元しました');
      }
      
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

  // 代替サウンドの作成（音声ファイルが見つからない場合用）
  const createFallbackSound = (): HTMLAudioElement => {
    try {
      // AudioContextを使用してシンプルなビープ音を生成
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4音
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // MediaStreamerノードを作成してAudio要素に変換
      const dest = audioContext.createMediaStreamDestination();
      gainNode.connect(dest);
      
      const audio = new Audio();
      audio.srcObject = dest.stream;
      
      return audio;
    } catch (e) {
      console.error('代替音声の作成に失敗:', e);
      return new Audio();
    }
  };

  // サポートされている音声形式を確認
  const checkSupportedAudioFormats = () => {
    const audio = document.createElement('audio');
    const formats = {
      mp3: audio.canPlayType('audio/mpeg'),
      wav: audio.canPlayType('audio/wav'),
      ogg: audio.canPlayType('audio/ogg'),
      aac: audio.canPlayType('audio/aac')
    };
    
    const supported = Object.entries(formats)
      .filter(([_, support]) => support !== '')
      .map(([format]) => format);
    
    console.log('サポートされている音声形式:', supported);
    return supported;
  };

  // コンソールでサウンドファイルの存在を確認する
  const checkFileExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (err) {
      console.warn(`ファイル存在確認エラー (${url}):`, err);
      return false;
    }
  };

  // 基本的な通知音のプリロード
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // サポートされている音声形式を確認
        const supportedFormats = checkSupportedAudioFormats();
        console.log('サポートされている音声形式:', supportedFormats);
        
        if (supportedFormats.length === 0) {
          throw new Error('サポートされている音声形式がありません');
        }
        
        // 可能性のあるパスのリスト
        const pathPrefixes = [
          '/sounds/',
          './sounds/',
          '../sounds/',
          '/assets/sounds/',
          './assets/sounds/',
          '/public/sounds/',
          './public/sounds/',
          '/'
        ];
        
        // インメモリで通知音を用意
        const basicSound = new Audio();
        basicSound.volume = Math.min(Math.max(volume, 0), 1);
        basicSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['default'] = basicSound;
        
        // 重要通知音
        const importantSound = new Audio();
        importantSound.volume = Math.min(Math.max(volume, 0), 1);
        importantSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['important'] = importantSound;
        
        // プレミアム通知音
        const premiumSound = new Audio();
        premiumSound.volume = Math.min(Math.max(volume, 0), 1);
        premiumSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['premium'] = premiumSound;
        
        // 実績通知音
        const achievementSound = new Audio();
        achievementSound.volume = Math.min(Math.max(volume, 0), 1);
        achievementSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['achievement'] = achievementSound;
        
        // プレミアム特別通知音
        const premiumSpecialSound = new Audio();
        premiumSpecialSound.volume = Math.min(Math.max(volume, 0), 1);
        premiumSpecialSound.addEventListener('ended', () => setIsPlaying(false));
        audioRefs.current['premium-special'] = premiumSpecialSound;
        
        // 様々なパスと形式で基本の通知音を探す
        let foundBasicSoundPath = '';
        let foundBasicSoundFormat = '';
        
        for (const format of supportedFormats) {
          for (const prefix of pathPrefixes) {
            const testPath = `${prefix}notification.${format}`;
            if (await checkFileExists(testPath)) {
              foundBasicSoundPath = testPath;
              foundBasicSoundFormat = format;
              console.log(`通知音ファイルを発見: ${testPath}`);
              break;
            }
          }
          if (foundBasicSoundPath) break;
        }
        
        if (foundBasicSoundPath) {
          // 基本パスが見つかったので、他の音声ファイルも同じディレクトリから探す
          const basePath = foundBasicSoundPath.substring(0, foundBasicSoundPath.lastIndexOf('/') + 1);
          const baseFormat = foundBasicSoundFormat;
          
          // 各種通知音のパスを設定（同じ形式で）
          basicSound.src = foundBasicSoundPath;
          
          // 他の通知音は存在確認してから設定
          const importantPath = `${basePath}important-notification.${baseFormat}`;
          const premiumPath = `${basePath}premium-notification.${baseFormat}`;
          const achievementPath = `${basePath}achievement.${baseFormat}`;
          const premiumSpecialPath = `${basePath}premium-special.${baseFormat}`;
          
          // 重要通知音の存在確認と設定
          if (await checkFileExists(importantPath)) {
            importantSound.src = importantPath;
          } else {
            importantSound.src = foundBasicSoundPath; // フォールバック
          }
          
          // プレミアム通知音の存在確認と設定
          if (await checkFileExists(premiumPath)) {
            premiumSound.src = premiumPath;
          } else {
            premiumSound.src = foundBasicSoundPath; // フォールバック
          }
          
          // 実績通知音の存在確認と設定
          if (await checkFileExists(achievementPath)) {
            achievementSound.src = achievementPath;
          } else {
            achievementSound.src = foundBasicSoundPath; // フォールバック
          }
          
          // プレミアム特別通知音の存在確認と設定
          if (await checkFileExists(premiumSpecialPath)) {
            premiumSpecialSound.src = premiumSpecialPath;
          } else {
            premiumSpecialSound.src = foundBasicSoundPath; // フォールバック
          }
          
          // オーディオをプリロード
          await Promise.all([
            new Promise<void>((resolve) => {
              basicSound.addEventListener('canplaythrough', () => resolve(), { once: true });
              basicSound.load();
            }),
            new Promise<void>((resolve) => {
              importantSound.addEventListener('canplaythrough', () => resolve(), { once: true });
              importantSound.load();
            }),
            new Promise<void>((resolve) => {
              premiumSound.addEventListener('canplaythrough', () => resolve(), { once: true });
              premiumSound.load();
            }),
            new Promise<void>((resolve) => {
              achievementSound.addEventListener('canplaythrough', () => resolve(), { once: true });
              achievementSound.load();
            }),
            new Promise<void>((resolve) => {
              premiumSpecialSound.addEventListener('canplaythrough', () => resolve(), { once: true });
              premiumSpecialSound.load();
            })
          ]).then(() => {
            console.log('すべての通知音ファイルのプリロードが完了しました');
          }).catch(err => {
            console.warn('一部の通知音ファイルのプリロードに失敗しました:', err);
          });
          
          console.log('通知音ファイルが確認できました。サウンドシステムを有効化します。');
          setSoundsLoaded(true);
        } else {
          console.warn('通知音ファイルが見つかりません。代替サウンドを使用します。');
          
          // 代替サウンドを設定
          const dataUriBeep = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...'; // 短いビープ音のデータURI
          
          basicSound.src = dataUriBeep;
          importantSound.src = dataUriBeep;
          premiumSound.src = dataUriBeep;
          achievementSound.src = dataUriBeep;
          premiumSpecialSound.src = dataUriBeep;
          
          // プリロード
          basicSound.load();
          importantSound.load();
          premiumSound.load();
          achievementSound.load();
          premiumSpecialSound.load();
          
          setSoundsLoaded(true);
          setSoundLoadError(false); // 代替サウンドが設定されたので、エラーフラグを解除
        }
      } catch (err) {
        console.error('音声システムの初期化に失敗:', err);
        setIsSupported(false);
        setSoundLoadError(true);
      }
    };
    
    loadSounds();

    return () => {
      // クリーンアップ
      Object.values(audioRefs.current).forEach(audio => {
        audio.removeEventListener('ended', () => setIsPlaying(false));
        audio.pause();
      });
      audioRefs.current = {};
    };
  }, [volume]);

  // ブラウザのautoplay制限対策 - 実際に音声を再生する代わりに視覚的な通知をエミュレート
  const handleNewNotificationVisually = (notificationId: string, soundType: string) => {
    // 最近同じ通知IDの処理をしていないか確認
    const now = Date.now();
    const recentPlay = playHistoryRef.current.find(
      h => h.id === notificationId && now - h.time < 5000
    );
    
    if (!recentPlay) {
      // 再生履歴に追加
      playHistoryRef.current.push({ id: notificationId, time: now });
      
      // キューに追加（ユーザーがインタラクションした後に再生できるように）
      notificationQueueRef.current.push({
        id: notificationId,
        soundType,
        timestamp: now
      });
      
      // キューが大きくなりすぎないように古いエントリを削除
      if (notificationQueueRef.current.length > 10) {
        notificationQueueRef.current = notificationQueueRef.current.slice(-5);
      }
      
      // 履歴が大きくなりすぎないように古いものを削除
      if (playHistoryRef.current.length > 20) {
        playHistoryRef.current = playHistoryRef.current.slice(-10);
      }
      
      // 通知から30分以上経過したものはキューから削除
      notificationQueueRef.current = notificationQueueRef.current.filter(
        item => now - item.timestamp < 30 * 60 * 1000
      );
      
      // ここで視覚的な通知をエミュレートできる
      // 例: ブラウザのタイトルを点滅させる、タブアイコンを変更するなど
      const originalTitle = document.title;
      document.title = '🔔 新しい通知があります！';
      
      setTimeout(() => {
        document.title = originalTitle;
      }, 3000);
      
      console.log('視覚的な通知をエミュレートしました:', {
        id: notificationId,
        type: soundType
      });
      
      return true;
    }
    
    return false;
  };

  // 新規通知の検知と音声再生/視覚的通知
  useEffect(() => {
    if (!soundEnabled || !isSupported) return;

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
              
      // 視覚的な通知をエミュレート
      handleNewNotificationVisually(latestNotification.id, soundType);
      
      // インタラクション済みの場合は音声再生を試みる
      if (hasInteractedRef.current && !isPlaying && soundsLoaded) {
        const soundToPlay = audioRefs.current[soundType] || audioRefs.current['default'];
        
        if (soundToPlay && soundToPlay.src) {
          setIsPlaying(true);
          soundToPlay.currentTime = 0;
          
          soundToPlay.play().then(() => {
            console.log('通知音を再生しました', soundType);
          }).catch(err => {
            console.error('通知音再生に失敗:', err);
            setIsPlaying(false);
            
            // エラーの種類に応じて対処
            if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') {
              // サポートされていない、または許可されていない場合、代替サウンドを再生
              try {
                const beep = createFallbackSound();
                beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
              } catch (beepErr) {
                console.error('代替音声の作成/再生に失敗:', beepErr);
              }
            }
          });
        } else {
          console.warn('有効な音声ファイルがありません。代替音を使用します。');
          try {
            const beep = createFallbackSound();
            beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
          } catch (beepErr) {
            console.error('代替音声の作成/再生に失敗:', beepErr);
          }
        }
      }
    }

    prevCountRef.current = notifications.length;
    prevUnreadRef.current = unreadCount;
  }, [notifications, unreadCount, soundEnabled, isSupported, isPremium, isPlaying, soundsLoaded]);

  // リアルタイム通知イベントのリスナー設定
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent<{notification: any, isPremium: boolean}>) => {
      if (!soundEnabled || !isSupported) return;
      
      const { notification } = event.detail;
      
      // 通知の優先度や種類に応じた音声を選択
      let soundType = 'default';
      
      if (notification.is_premium_only || 
         (notification.message && notification.message.includes('プレミアム'))) {
        soundType = 'premium-special';
      } else if (notification.priority === 'high') {
        soundType = 'important';
      } else if (notification.type === 'achievement') {
        soundType = 'achievement';
      } else if (isPremium) {
        soundType = 'premium';
      }
      
      // 視覚的な通知をエミュレート
      handleNewNotificationVisually(notification.id, soundType);
      
      // インタラクション済みの場合は音声再生を試みる
      if (hasInteractedRef.current && !isPlaying && soundsLoaded) {
        const soundToPlay = audioRefs.current[soundType] || audioRefs.current['default'];
        
        if (soundToPlay && soundToPlay.src) {
          setIsPlaying(true);
          soundToPlay.currentTime = 0;
          
          soundToPlay.play().then(() => {
            console.log('イベント通知音を再生しました', soundType);
          }).catch(err => {
            console.error('イベント通知音再生に失敗:', err);
            setIsPlaying(false);
            
            // エラーの種類に応じて対処
            if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') {
              // サポートされていない、または許可されていない場合、代替サウンドを再生
              try {
                const beep = createFallbackSound();
                beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
              } catch (beepErr) {
                console.error('代替音声の作成/再生に失敗:', beepErr);
              }
            }
          });
        } else {
          console.warn('有効な音声ファイルがありません。代替音を使用します。');
          try {
            const beep = createFallbackSound();
            beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
          } catch (beepErr) {
            console.error('代替音声の作成/再生に失敗:', beepErr);
          }
        }
      }
    };

    // カスタムイベントリスナーを追加
    window.addEventListener('newNotification', handleNewNotification as EventListener);
    
    return () => {
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [soundEnabled, isSupported, isPremium, isPlaying, soundsLoaded]);

  // ユーザーインタラクション検出とその後の音声再生
  useEffect(() => {
    // ユーザーインタラクション（クリック、タッチなど）を検出する関数
    const handleUserInteraction = () => {
      if (hasInteractedRef.current) return; // 既に検出済みの場合は何もしない
      
      hasInteractedRef.current = true;
      console.log('ユーザーインタラクションを検出しました');
      
      // インタラクション状態をローカルストレージに保存
      try {
        localStorage.setItem('hasInteracted', 'true');
      } catch (err) {
        console.warn('インタラクション状態の保存に失敗:', err);
      }
      
      // ファイルがロードできなかった場合は代替サウンドを使用
      if (soundLoadError) {
        console.warn('音声ファイルが見つからないため、代替サウンドを使用します');
        
        // 代替サウンドを設定
        Object.values(audioRefs.current).forEach(audio => {
          try {
            // 代替ビープ音のデータURIを設定
            audio.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...';
            audio.load();
          } catch (err) {
            console.error('代替サウンドの設定に失敗:', err);
          }
        });
        
        setSoundLoadError(false); // 代替サウンドを設定したのでエラーフラグをリセット
        setSoundsLoaded(true);
      }
      
      // インタラクション後にキューにある通知音を再生（一つだけ）
      if (notificationQueueRef.current.length > 0 && soundEnabled && !isPlaying && soundsLoaded) {
        const nextNotification = notificationQueueRef.current.shift();
        if (nextNotification) {
          // キューから最も新しい通知を取得して再生を試みる
          const soundToPlay = audioRefs.current[nextNotification.soundType] || audioRefs.current['default'];
          
          if (soundToPlay && soundToPlay.src) {
            setIsPlaying(true);
            soundToPlay.currentTime = 0;
            
            // インタラクション直後なので再生できるはず
            soundToPlay.play().then(() => {
              console.log('通知音を再生しました', nextNotification.soundType);
            }).catch(err => {
              console.error('インタラクション後の通知音再生に失敗:', err);
              setIsPlaying(false);
              
              // エラーの種類に応じて対処
              if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') {
                // サポートされていない、または許可されていない場合、代替サウンドを再生
                try {
                  const beep = createFallbackSound();
                  beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
                } catch (beepErr) {
                  console.error('代替音声の作成/再生に失敗:', beepErr);
                }
              }
            });
          } else {
            console.warn('有効な音声ファイルがありません。代替音を使用します。');
            try {
              const beep = createFallbackSound();
              beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
            } catch (beepErr) {
              console.error('代替音声の作成/再生に失敗:', beepErr);
            }
          }
        }
      }
      
      // 以降のインタラクションは通常のイベントリスナーで処理
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('mousedown', handleUserInteraction);
    };
    
    // ユーザーインタラクションイベントを監視（より多くのイベントを追加）
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('scroll', handleUserInteraction);
    document.addEventListener('mousedown', handleUserInteraction);
    
    return () => {
      // クリーンアップ
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('mousedown', handleUserInteraction);
    };
  }, [soundEnabled, isPlaying, soundsLoaded, soundLoadError]);

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

  // 通知音テスト用の公開API
  useEffect(() => {
    const handleTestSound = (event: CustomEvent<{type?: string}>) => {
      if (!soundEnabled || !isSupported) {
        console.log('通知音テスト: 条件を満たしていないため再生できません。', {
          soundEnabled,
          isSupported,
          hasInteracted: hasInteractedRef.current
        });
        return;
      }
      
      const { type = 'default' } = event.detail;
      const soundKey = audioRefs.current[type] ? type : 'default';
      
      // テスト通知用のID
      const testNotificationId = 'test-notification-' + Date.now();
      
      // 視覚的な通知をエミュレート
      handleNewNotificationVisually(testNotificationId, soundKey);
      
      // ユーザーがすでにインタラクションしていれば音を鳴らす試み
      if (hasInteractedRef.current && !isPlaying && soundsLoaded) {
        const soundToPlay = audioRefs.current[soundKey];
        if (soundToPlay && soundToPlay.src) {
          setIsPlaying(true);
          soundToPlay.currentTime = 0;
          soundToPlay.play().catch(err => {
            console.error('テスト通知音の再生に失敗:', err);
            setIsPlaying(false);
            
            // エラーの種類に応じて対処
            if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') {
              // サポートされていないソースの場合、ブラウザ内で生成した音を再生
              try {
                const beep = createFallbackSound();
                beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
              } catch (beepErr) {
                console.error('代替音声の作成/再生に失敗:', beepErr);
              }
            }
          });
        } else {
          console.warn('音声ファイルが見つからないため、再生をスキップします。代替音を使用します。');
          try {
            const beep = createFallbackSound();
            beep.play().catch(e => console.error('代替音声の再生に失敗:', e));
          } catch (beepErr) {
            console.error('代替音声の作成/再生に失敗:', beepErr);
          }
        }
      }
    };
    
    window.addEventListener('testNotificationSound', handleTestSound as EventListener);
    return () => {
      window.removeEventListener('testNotificationSound', handleTestSound as EventListener);
    };
  }, [soundEnabled, isSupported, isPlaying, soundsLoaded]);

  // 開発モードのデバッグ情報
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // グローバルオブジェクトにデバッグ関数を追加
      (window as any).__notificationSoundDebug = {
        getStatus: () => ({
          hasInteracted: hasInteractedRef.current,
          isPlaying,
          soundEnabled,
          isSupported,
          soundsLoaded,
          soundLoadError,
          notificationQueue: [...notificationQueueRef.current],
          playHistory: [...playHistoryRef.current],
          audioRefs: Object.keys(audioRefs.current).map(key => ({
            key,
            src: audioRefs.current[key].src || 'no-src',
            readyState: audioRefs.current[key].readyState,
            error: audioRefs.current[key].error ? audioRefs.current[key].error.message : null
          })),
          supportedFormats: checkSupportedAudioFormats()
        }),
        testSound: (type: string = 'default') => {
          const event = new CustomEvent('testNotificationSound', {
            detail: { type }
          });
          window.dispatchEvent(event);
          return 'テスト通知を送信しました。ブラウザの制限により音が鳴らない場合があります。';
        },
        createTestBeep: () => {
          try {
            const beep = createFallbackSound();
            beep.play().catch(e => console.error('テスト用ビープ音の再生に失敗:', e));
            return 'テスト用ビープ音を再生しました';
          } catch (err) {
            console.error('テスト用ビープ音の作成/再生に失敗:', err);
            return 'テスト用ビープ音の再生に失敗しました';
          }
        },
        resetInteractionState: () => {
          hasInteractedRef.current = false;
          localStorage.removeItem('hasInteracted');
          return 'インタラクション状態をリセットしました';
        },
        forceTriggerInteraction: () => {
          hasInteractedRef.current = true;
          localStorage.setItem('hasInteracted', 'true');
          return 'インタラクション状態を強制的にトリガーしました';
        }
      };
    }
  }, [isPlaying, soundEnabled, isSupported, soundsLoaded, soundLoadError]);

  // このコンポーネントは何も表示しない
  return null;
}