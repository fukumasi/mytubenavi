// src/components/shared/AnalyticsTracker.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsTrackerProps {
  bookingId: string;
  isVisible?: boolean;
  children: React.ReactNode;
  trackClicks?: boolean;
  sessionTimeout?: number; // セッションタイムアウト（ミリ秒）
}

/**
 * 広告インプレッションとクリックを追跡するコンポーネント
 * @param bookingId 追跡する予約ID
 * @param isVisible コンポーネントが視覚的に表示されているかどうか（デフォルトはtrue）
 * @param children 追跡する子要素（広告コンテンツ）
 * @param trackClicks クリック追跡を有効にするかどうか（デフォルトはtrue）
 * @param sessionTimeout 同一セッションと見なす時間（ミリ秒、デフォルトは30分）
 */
export default function AnalyticsTracker({ 
  bookingId, 
  isVisible = true, 
  children,
  trackClicks = true,
  sessionTimeout = 30 * 60 * 1000 // デフォルトは30分
}: AnalyticsTrackerProps) {
  const { user } = useAuth();
  const [impressionLogged, setImpressionLogged] = useState(false);
  const [lastImpressionTime, setLastImpressionTime] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [clickCooldown, setClickCooldown] = useState(false);

  // セッションIDの生成
  useEffect(() => {
    if (!sessionId) {
      const newSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(newSessionId);
    }
  }, [sessionId]);

  // インプレッションをログに記録する関数
  const logImpression = useCallback(async () => {
    if (!bookingId || !isVisible || !user) return;

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
        .select('id, impressions, unique_impressions, session_ids')
        .eq('booking_id', bookingId)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 は "結果が見つからない" エラー
        console.error('Error checking analytics:', error);
        return;
      }
      
      // セッションIDの配列を準備
      let sessionIds: string[] = [];
      let isUniqueImpression = true;
      
      if (data && data.session_ids) {
        try {
          sessionIds = Array.isArray(data.session_ids) ? data.session_ids : JSON.parse(data.session_ids);
          // 既に同じセッションIDが記録されているかチェック
          isUniqueImpression = !sessionIds.includes(sessionId);
        } catch (e) {
          console.error('Error parsing session_ids:', e);
          sessionIds = [];
        }
      }
      
      // 新しいセッションIDを追加（重複しないように）
      if (isUniqueImpression) {
        sessionIds.push(sessionId);
      }
      
      if (data) {
        // 既存のレコードを更新
        const { error: updateError } = await supabase
          .from('slot_booking_analytics')
          .update({
            impressions: (data.impressions || 0) + 1,
            unique_impressions: isUniqueImpression ? (data.unique_impressions || 0) + 1 : (data.unique_impressions || 0),
            session_ids: sessionIds,
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
              unique_impressions: 1,
              session_ids: [sessionId],
              clicks: 0,
              unique_clicks: 0
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
  }, [bookingId, isVisible, user, lastImpressionTime, sessionId, sessionTimeout]);

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
    if (!bookingId || !user) return;
    
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
        .select('id, clicks, unique_clicks, click_session_ids')
        .eq('booking_id', bookingId)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking analytics for click:', error);
        return;
      }
      
      // セッションIDの配列を準備（クリック用）
      let clickSessionIds: string[] = [];
      let isUniqueClick = true;
      
      if (data && data.click_session_ids) {
        try {
          clickSessionIds = Array.isArray(data.click_session_ids) 
            ? data.click_session_ids 
            : JSON.parse(data.click_session_ids);
          // 既に同じセッションIDが記録されているかチェック
          isUniqueClick = !clickSessionIds.includes(sessionId);
        } catch (e) {
          console.error('Error parsing click_session_ids:', e);
          clickSessionIds = [];
        }
      }
      
      // 新しいセッションIDを追加（重複しないように）
      if (isUniqueClick) {
        clickSessionIds.push(sessionId);
      }
      
      if (data) {
        // 既存のレコードを更新
        const { error: updateError } = await supabase
          .from('slot_booking_analytics')
          .update({
            clicks: (data.clicks || 0) + 1,
            unique_clicks: isUniqueClick ? (data.unique_clicks || 0) + 1 : (data.unique_clicks || 0),
            click_session_ids: clickSessionIds,
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
              unique_impressions: 1,
              session_ids: [sessionId],
              clicks: 1,
              unique_clicks: 1,
              click_session_ids: [sessionId]
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
  }, [bookingId, user, lastClickTime, sessionId]);

  // クリックイベントハンドラ - 未使用引数を削除
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

/**
 * 使用例:
 * 
 * <AnalyticsTracker 
 *   bookingId="booking-id-here" 
 *   isVisible={isElementVisible}
 *   trackClicks={true}
 *   sessionTimeout={1800000} // 30分
 * >
 *   <AdContent>
 *     広告コンテンツ
 *   </AdContent>
 * </AnalyticsTracker>
 */