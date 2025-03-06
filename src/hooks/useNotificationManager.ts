// src/hooks/useNotificationManager.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Notification, 
  NotificationType, 
  NotificationPreference 
} from '../types/notification';
import { notificationService } from '../services/notificationService';

const RECONNECT_DELAY = 5000; // 再接続の待機時間（ミリ秒）

export const useNotificationManager = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const { user } = useAuth();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: Notification) => !n.is_read).length || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('通知の取得に失敗しました'));
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const preferences = await notificationService.getNotificationPreferences(user.id);
      setPreferences(preferences);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('通知設定の取得に失敗しました'));
      console.error('Error fetching preferences:', err);
    }
  }, [user]);

  const createNotification = async (
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ) => {
    if (!user) return null;

    try {
      const notification: Omit<Notification, 'id' | 'created_at' | 'is_read'> = {
        user_id: user.id,
        type,
        title,
        message,
        source_id: data?.source_id as string,
        source_type: data?.source_type as string,
        link: data?.link as string,
        thumbnail_url: data?.thumbnail_url as string,
        priority: data?.priority as 'high' | 'medium' | 'low' || 'medium',
        action_taken: false,
        sender_id: data?.sender_id as string,
        metadata: data?.metadata as any
      };

      const newNotification = await notificationService.createNotification(notification);

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      setError(null);
      return newNotification;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('通知の作成に失敗しました'));
      console.error('Error creating notification:', err);
      return null;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId 
            ? { ...n, is_read: true, updated_at: new Date().toISOString() } 
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('通知の既読処理に失敗しました'));
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await notificationService.markAllAsRead(user.id);

      setNotifications(prev =>
        prev.map(n => ({ 
          ...n, 
          is_read: true, 
          updated_at: new Date().toISOString()
        }))
      );
      setUnreadCount(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('全通知の既読処理に失敗しました'));
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);

      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('通知の削除に失敗しました'));
      console.error('Error deleting notification:', err);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreference>) => {
    if (!user) return;

    try {
      await notificationService.updateNotificationPreferences(user.id, newPreferences);

      setPreferences(prev => 
        prev ? { ...prev, ...newPreferences, updated_at: new Date().toISOString() } : null
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('通知設定の更新に失敗しました'));
      console.error('Error updating preferences:', err);
    }
  };

  const setupRealtimeSubscription = useCallback(() => {
    if (!user || subscriptionRef.current) return;

    try {
      const subscription = supabase
        .channel(`notifications:${user.id}`)
        .on<Notification>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const { new: newNotification, old: oldNotification, eventType } = payload as {
              new: Notification;
              old: { id: string, is_read?: boolean };
              eventType: 'INSERT' | 'UPDATE' | 'DELETE';
            };

            switch (eventType) {
              case 'INSERT':
                setNotifications(prev => [newNotification, ...prev]);
                if (!newNotification.is_read) {
                  setUnreadCount(prev => prev + 1);
                }
                break;
              case 'UPDATE':
                setNotifications(prev =>
                  prev.map(n =>
                    n.id === newNotification.id ? newNotification : n
                  )
                );
                // 既読状態が変更された場合に未読カウントを更新
                if (oldNotification && (newNotification.is_read !== oldNotification.is_read)) {
                  setUnreadCount(prev => 
                    newNotification.is_read ? prev - 1 : prev + 1
                  );
                }
                break;
              case 'DELETE':
                const wasUnread = notifications.find(
                  n => n.id === oldNotification.id
                )?.is_read === false;
                setNotifications(prev =>
                  prev.filter(n => n.id !== oldNotification.id)
                );
                if (wasUnread) {
                  setUnreadCount(prev => Math.max(0, prev - 1));
                }
                break;
            }
          }
        )
        .subscribe(status => {
          setIsConnected(status === 'SUBSCRIBED');
          console.log('Subscription status:', status);
        });

      subscriptionRef.current = subscription;
    } catch (err) {
      console.error('Error setting up realtime subscription:', err);
      // 再接続を試みる
      reconnectTimeoutRef.current = setTimeout(() => {
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = null;
        setupRealtimeSubscription();
      }, RECONNECT_DELAY);
    }
  }, [user, notifications]);

  // 初期データの取得
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [user, fetchNotifications, fetchPreferences]);

  // リアルタイム通知の購読設定
  useEffect(() => {
    setupRealtimeSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupRealtimeSubscription]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    preferences,
    isConnected,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    refetch: fetchNotifications
  };
};

export default useNotificationManager;