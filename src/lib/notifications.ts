// src/lib/notifications.ts
import { supabase } from './supabase';
import { Notification, NotificationPreferences, NotificationType } from '../types/notification';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CreateNotificationParams {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// エラーハンドリング用のカスタムエラー
export class NotificationError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NotificationError';
  }
}

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Notification[];
  } catch (error) {
    throw new NotificationError('通知の取得に失敗しました', error);
  }
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    throw new NotificationError('未読数の取得に失敗しました', error);
  }
};

export const markAsRead = async (notificationId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    throw new NotificationError('既読処理に失敗しました', error);
  }
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  } catch (error) {
    throw new NotificationError('全既読処理に失敗しました', error);
  }
};

export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    throw new NotificationError('通知の削除に失敗しました', error);
  }
};

export const clearNotifications = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) throw error;
  } catch (error) {
    throw new NotificationError('通知のクリアに失敗しました', error);
  }
};

export const createNotification = async (params: CreateNotificationParams): Promise<Notification> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([params])
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  } catch (error) {
    throw new NotificationError('通知の作成に失敗しました', error);
  }
};

export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as NotificationPreferences;
  } catch (error) {
    throw new NotificationError('通知設定の取得に失敗しました', error);
  }
};

export const updateNotificationPreferences = async (
  userId: string,
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      });

    if (error) throw error;
  } catch (error) {
    throw new NotificationError('通知設定の更新に失敗しました', error);
  }
};

export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void,
  onError?: (error: Error) => void
): RealtimeChannel => {
  return supabase
    .channel(`notifications:${userId}`)
    .on<Notification>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        try {
          onNotification(payload.new);
        } catch (error) {
          onError?.(new NotificationError('通知の処理に失敗しました', error));
        }
      }
    )
    .subscribe();
};