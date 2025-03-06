// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Notification, 
  NotificationType 
} from '../types/notification';
import { notificationService } from '../services/notificationService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('通知の取得エラー:', err);
      setError('通知の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? {...n, is_read: true} : n)
      );
    } catch (err) {
      console.error('通知既読エラー:', err);
      setError('通知の更新に失敗しました');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await notificationService.markAllAsRead(user.id);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('すべての通知既読エラー:', err);
      setError('通知の更新に失敗しました');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('通知削除エラー:', err);
      setError('通知の削除に失敗しました');
    }
  };

  const filterNotifications = (type?: NotificationType) => {
    return type 
      ? notifications.filter(n => n.type === type)
      : notifications;
  };

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications' 
        },
        (payload) => {
          const { eventType } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    filterNotifications,
    unreadCount: getUnreadCount()
  };
}

export default useNotifications;