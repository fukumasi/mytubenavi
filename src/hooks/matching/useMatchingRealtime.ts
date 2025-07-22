// src/hooks/matching/useMatchingRealtime.ts

import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { ConnectionStatus } from '@/types/matching';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * リアルタイム接続監視ロジック
 */
export function useMatchingRealtime(userId: string) {
  const connectionSubscriptionRef = useRef<RealtimeChannel | null>(null);

  /**
   * 接続状態を更新する関数（外部から渡して使う）
   */
  const updateConnectionStatusInState = useCallback((
    connectedUserId: string,
    status: ConnectionStatus | undefined,
    connectionId: string | null
  ) => {
    // この関数はuseMatchingCoreから渡してもらう想定
    console.log(`接続ステータス更新: ユーザー${connectedUserId}, ステータス: ${status}, 接続ID: ${connectionId}`);
    // ※実際のstate更新処理はuseMatchingCoreで定義
  }, []);

  /**
   * 接続変更をリアルタイム監視する
   */
  const subscribeToConnectionChanges = useCallback(() => {
    if (!userId || connectionSubscriptionRef.current) {
      return () => {};
    }

    const subscription = supabase
      .channel(`matching-connections-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `or(user_id.eq.${userId},connected_user_id.eq.${userId})`
      }, (payload) => {
        const newData = payload.new as any;
        const oldData = payload.old as any;
        const connectionId = newData?.id || oldData?.id;
        const status = newData?.status;
        const targetUserId = (newData?.user_id === userId ? newData.connected_user_id : newData.user_id);

        if (!targetUserId) {
          console.warn('接続変更通知に必要なデータが不足しています');
          return;
        }

        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          updateConnectionStatusInState(targetUserId, status, connectionId ?? null);
        } else if (payload.eventType === 'DELETE') {
          updateConnectionStatusInState(targetUserId, undefined, null);
        }
      })
      .subscribe((status, err) => {
        if (err) {
          console.error('Realtime subscriptionエラー:', err);
          toast.error('リアルタイム接続エラーが発生しました');
          connectionSubscriptionRef.current = null;
        } else {
          console.log('Realtime subscription状態:', status);
          connectionSubscriptionRef.current = subscription;
        }
      });

    return () => {
      if (connectionSubscriptionRef.current) {
        supabase.removeChannel(connectionSubscriptionRef.current)
          .then(() => {
            console.log('リアルタイム監視解除完了');
            connectionSubscriptionRef.current = null;
          })
          .catch(err => console.error('チャンネル解除エラー:', err));
      }
    };
  }, [userId, updateConnectionStatusInState]);

  return {
    subscribeToConnectionChanges,
    connectionSubscriptionRef,
  };
}
