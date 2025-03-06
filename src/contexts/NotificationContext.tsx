// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  Notification,
  NotificationType,
  NotificationPreference
} from '../types/notification';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  filterNotifications: (type?: NotificationType) => Notification[];
  updateNotificationPreferences: (preferences: Partial<NotificationPreference>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotifications(data as Notification[] || []);
    } catch (err) {
      console.error('通知の取得に失敗:', err);
      setError('通知の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
                updated_at: new Date().toISOString()
              }
            : notification
        )
      );
    } catch (err) {
      console.error('通知の既読処理に失敗:', err);
      setError('通知の更新に失敗しました');
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) throw updateError;

      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          updated_at: new Date().toISOString()
        }))
      );
    } catch (err) {
      console.error('全通知の既読処理に失敗:', err);
      setError('通知の一括更新に失敗しました');
      throw err;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (err) {
      console.error('通知の削除に失敗:', err);
      setError('通知の削除に失敗しました');
      throw err;
    }
  };

  const clearNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (deleteError) throw deleteError;

      setNotifications(prev => prev.filter(notification => !notification.is_read));
    } catch (err) {
      console.error('通知のクリアに失敗:', err);
      setError('通知のクリアに失敗しました');
      throw err;
    }
  };

  const filterNotifications = (type?: NotificationType) => {
    if (!type) return notifications;
    return notifications.filter(notification => notification.type === type);
  };

  const updateNotificationPreferences = async (preferences: Partial<NotificationPreference>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // まず設定が存在するか確認
      const { data: existingPrefs } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const timestamp = new Date().toISOString();
      
      if (existingPrefs) {
        // 既存の設定を更新
        const { error: updateError } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: timestamp
          })
          .eq('id', existingPrefs.id);

        if (updateError) throw updateError;
      } else {
        // 新規設定を作成
        const defaultPreferences = {
          user_id: user.id,
          video_comments: true,
          review_replies: true,
          likes: true,
          follows: true,
          system_notifications: true,
          new_videos: true,
          ratings: true,
          favorites: true,
          mentions: true,
          achievements: true,
          recommendations: true,
          milestones: true,
          subscriptions: true,
          email_notifications: false,
          push_notifications: true,
          in_app_notifications: true,
          created_at: timestamp,
          updated_at: timestamp
        };

        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            ...defaultPreferences,
            ...preferences
          });

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('通知設定の更新に失敗:', err);
      setError('通知設定の更新に失敗しました');
      throw err;
    }
  };

  useEffect(() => {
    const setupNotificationChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newChannel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const eventType = payload.eventType;
            if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
              fetchNotifications();
            }
          }
        )
        .subscribe();

      setChannel(newChannel);
    };

    setupNotificationChannel();
    fetchNotifications();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    deleteNotification,
    clearNotifications,
    filterNotifications,
    updateNotificationPreferences
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}