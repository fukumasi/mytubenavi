// src/components/shared/AnalyticsTracker.tsx（修正版）
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
// useAuthは使用されていないので削除
// import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsTrackerProps {
  bookingId: string;
  isVisible?: boolean;
  children: React.ReactNode;
  trackClicks?: boolean;
  sessionTimeout?: number; // セッションタイムアウト（ミリ秒）
}

/**
 * 広告インプレッションとクリックを追跡するコンポーネント
 */
export default function AnalyticsTracker({ 
  bookingId, 
  isVisible = true, 
  children,
  trackClicks = true,
  sessionTimeout = 30 * 60 * 1000 // デフォルトは30分
}: AnalyticsTrackerProps) {
  // useAuthからuserを取得する行を削除
  // const { user } = useAuth();
  const [impressionLogged, setImpressionLogged] = useState(false);
  const [lastImpressionTime, setLastImpressionTime] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [clickCooldown, setClickCooldown] = useState(false);

  // インプレッションをログに記録する関数
  const logImpression = useCallback(async () => {
    if (!bookingId || !isVisible) return;

    try {
      // 現在時刻を取得
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      
      // 前回のインプレッションから一定時間経過していない場合はカウントしない
      if (now - lastImpressionTime < sessionTimeout) {
        return;
      }
      
      // 既存のレコードを検索
      const { data, error } = await supabase
        .from('slot_booking_analytics')
        .select('id, impressions, clicks')
        .eq('booking_id', bookingId)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 は "結果が見つからない" エラー
        console.error('Error checking analytics:', error);
        return;
      }
      
      if (data) {
        // 既存のレコードを更新
        const { error: updateError } = await supabase
          .from('slot_booking_analytics')
          .update({
            impressions: (data.impressions || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
          
        if (updateError) {
          console.error('Error updating impressions:', updateError);
          return;
        }
      } else {
        // 新しいレコードを作成
        const { error: insertError } = await supabase
          .from('slot_booking_analytics')
          .insert([
            {
              booking_id: bookingId,
              date: today,
              impressions: 1,
              clicks: 0
            }
          ]);
          
        if (insertError) {
          console.error('Error logging impression:', insertError);
          return;
        }
      }
      
      setLastImpressionTime(now);
      setImpressionLogged(true);
      
      // セッションタイムアウトを設定
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setImpressionLogged(false);
      }, sessionTimeout);
      
    } catch (err) {
      console.error('Error in logImpression:', err);
    }
  }, [bookingId, isVisible, lastImpressionTime, sessionTimeout]);

  // 表示状態が変わった時にインプレッションを記録
  useEffect(() => {
    if (isVisible && !impressionLogged) {
      logImpression();
    }
  }, [isVisible, impressionLogged, logImpression]);

  // コンポーネントがアンマウントされる時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // クリックを記録する関数
  const logClick = useCallback(async () => {
    if (!bookingId) return;
    
    // クリックのクールダウン中なら記録しない（短時間での連打防止）
    const now = Date.now();
    if (now - lastClickTime < 1000) { // 1秒以内の連打は無視
      return;
    }
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 既存のレコードを検索
      const { data, error } = await supabase
        .from('slot_booking_analytics')
        .select('id, clicks')
        .eq('booking_id', bookingId)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking analytics for click:', error);
        return;
      }
      
      if (data) {
        // 既存のレコードを更新
        const { error: updateError } = await supabase
          .from('slot_booking_analytics')
          .update({
            clicks: (data.clicks || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
          
        if (updateError) {
          console.error('Error updating clicks:', updateError);
        }
      } else {
        // 新しいレコードを作成（インプレッションなしでクリックした珍しいケース）
        const { error: insertError } = await supabase
          .from('slot_booking_analytics')
          .insert([
            {
              booking_id: bookingId,
              date: today,
              impressions: 1, // クリックがあれば少なくとも1回表示されたとみなす
              clicks: 1
            }
          ]);
          
        if (insertError) {
          console.error('Error logging click:', insertError);
        }
      }
      
      // クリック時間を記録してクールダウンをセット
      setLastClickTime(now);
      setClickCooldown(true);
      
      // クールダウン解除用タイマー
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      
      clickTimeoutRef.current = setTimeout(() => {
        setClickCooldown(false);
      }, 1000); // 1秒間のクールダウン
      
    } catch (err) {
      console.error('Error in logClick:', err);
    }
  }, [bookingId, lastClickTime]);

  // クリックイベントハンドラ
  const handleClick = () => {
    if (!trackClicks || clickCooldown) return;
    
    // クリック追跡を非同期で実行（UIブロッキングを防止）
    setTimeout(() => {
      logClick();
    }, 0);
  };

  return (
    <div onClick={trackClicks ? handleClick : undefined}>
      {children}
    </div>
  );
}