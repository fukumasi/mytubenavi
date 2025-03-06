// src/lib/notifications.ts
import { supabase } from './supabase';
import { Notification, NotificationPreference, NotificationType } from '../types/notification';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CreateNotificationParams {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  source_id?: string;
  source_type?: string;
  link?: string;
  thumbnail_url?: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
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
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
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
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString() 
      })
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
    const timestamp = new Date().toISOString();
    const notification = {
      ...params,
      is_read: false,
      created_at: timestamp,
      updated_at: timestamp
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  } catch (error) {
    throw new NotificationError('通知の作成に失敗しました', error);
  }
};

export const getNotificationPreferences = async (userId: string): Promise<NotificationPreference | null> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as NotificationPreference | null;
  } catch (error) {
    throw new NotificationError('通知設定の取得に失敗しました', error);
  }
};

export const updateNotificationPreferences = async (
  userId: string,
  preferences: Partial<Omit<NotificationPreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    
    // まず設定が存在するか確認
    const { data: existingPrefs } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingPrefs) {
      // 既存の設定を更新
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          ...preferences,
          updated_at: timestamp
        })
        .eq('id', existingPrefs.id);

      if (error) throw error;
    } else {
      // 新規設定を作成
      const defaultPreferences = {
        user_id: userId,
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

      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          ...defaultPreferences,
          ...preferences
        });

      if (error) throw error;
    }
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