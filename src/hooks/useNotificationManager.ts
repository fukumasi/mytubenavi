// src/hooks/useNotificationManager.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Notification, 
  NotificationType, 
  NotificationPreferences 
} from '../types/notification';

const RECONNECT_DELAY = 5000; // 再接続の待機時間（ミリ秒）

export const useNotificationManager = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
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
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (fetchError) throw fetchError;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: Notification) => !n.isRead).length || 0);
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
      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!data) {
        const defaultPreferences: Partial<NotificationPreferences> = {
          userId: user.id,
          emailNotifications: true,
          pushNotifications: true,
          inAppNotifications: true,
          updatedAt: new Date().toISOString()
        };

        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert([defaultPreferences])
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs);
        setError(null);
      } else {
        setPreferences(data);
        setError(null);
      }
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
      const notification = {
        userId: user.id,
        type,
        title,
        message,
        metadata: data,
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: 'medium' as const,
        actionTaken: false
      };

      const { data: newNotification, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();

      if (error) throw error;

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
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('notifications')
        .update({ 
          isRead: true,
          readAt: timestamp,
          updatedAt: timestamp
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId 
            ? { ...n, isRead: true, readAt: timestamp, updatedAt: timestamp } 
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
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('notifications')
        .update({ 
          isRead: true,
          readAt: timestamp,
          updatedAt: timestamp
        })
        .eq('userId', user.id)
        .eq('isRead', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ 
          ...n, 
          isRead: true, 
          readAt: timestamp,
          updatedAt: timestamp 
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
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('通知の削除に失敗しました'));
      console.error('Error deleting notification:', err);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          userId: user.id,
          ...newPreferences,
          updatedAt: timestamp
        });

      if (error) throw error;

      setPreferences(prev => 
        prev ? { ...prev, ...newPreferences, updatedAt: timestamp } : null
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
            filter: `userId=eq.${user.id}`
          },
          (payload) => {
            const { new: newNotification, old: oldNotification, eventType } = payload as {
              new: Notification;
              old: { id: string, isRead?: boolean }; // isRead をオプショナルにした
              eventType: 'INSERT' | 'UPDATE' | 'DELETE';
            };

            switch (eventType) {
              case 'INSERT':
                setNotifications(prev => [newNotification, ...prev]);
                if (!newNotification.isRead) {
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
                if (oldNotification && (newNotification.isRead !== oldNotification.isRead)) { // oldNotificationがundefinedでないことを確認
                  setUnreadCount(prev => 
                    newNotification.isRead ? prev - 1 : prev + 1
                  );
                }
                break;
              case 'DELETE':
                const wasUnread = notifications.find(
                  n => n.id === oldNotification.id
                )?.isRead === false;
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