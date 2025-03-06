// src/services/notificationService.ts
import { supabase } from '@/lib/supabase';
import { 
  Notification, 
  NotificationPreference, 
  NotificationType 
} from '@/types/notification';

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('通知の取得に失敗しました');
    }
    return data || [];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      throw new Error('未読数の取得に失敗しました');
    }
    return count ?? 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('既読にできませんでした');
    }

    try {
      const channel = supabase.channel(`read-status-${notificationId}`);
      await channel
        .on(
          'presence',
          { event: 'sync' },
          () => {
            channel.track({ notification_id: notificationId, status: 'read' });
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error syncing read status:', error);
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: timestamp
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('一括既読にできませんでした');
    }

    try {
      const channel = supabase.channel(`bulk-read-status-${userId}`);
      await channel
        .on(
          'presence',
          { event: 'sync' },
          () => {
            channel.track({ user_id: userId, status: 'all_read' });
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error syncing bulk read status:', error);
    }
  },

  async createNotification(
    notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>
  ): Promise<Notification> {
    const timestamp = new Date().toISOString();
    const newNotification = {
      ...notification,
      is_read: false,
      created_at: timestamp,
      updated_at: timestamp
    };

    const { data, error } = await this.batchCreateNotifications([newNotification]);

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error('通知の作成に失敗しました');
    }
    return data[0];
  },

  async batchCreateNotifications(
    notifications: Array<Omit<Notification, 'id' | 'created_at' | 'is_read'>>
  ): Promise<{ data: Notification[], error: Error | null }> {
    const timestamp = new Date().toISOString();
    const batchNotifications = notifications.map(notification => ({
      ...notification,
      is_read: false,
      created_at: timestamp,
      updated_at: timestamp
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(batchNotifications)
      .select();

    if (error) {
      return { data: [], error };
    }
    return { data, error: null };
  },

  async updateReviewCount(videoId: string): Promise<number> {
    try {
      // レビュー数を正確に取得
      const { count, error: countError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('video_id', videoId);
  
      if (countError) throw countError;
  
      const reviewCount = count ?? 0;
  
      // ビデオのレビュー数を更新
      const { error: updateError } = await supabase
        .from('videos')
        .update({ review_count: reviewCount })
        .eq('id', videoId);
  
      if (updateError) throw updateError;
  
      return reviewCount;
  
    } catch (error) {
      console.error('Error updating review count:', error);
      throw new Error('レビュー数の更新に失敗しました');
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw new Error('通知の削除に失敗しました');
    }
  },

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      throw new Error('通知設定の取得に失敗しました');
    }
    return data;
  },

  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreference>
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // 既存の設定を確認
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

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw new Error('通知設定の更新に失敗しました');
      }
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
        quiet_hours_enabled: false,
        max_notifications_per_day: 50,
        batch_notifications: false,
        batch_interval_minutes: 30,
        created_at: timestamp,
        updated_at: timestamp
      };

      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          ...defaultPreferences,
          ...preferences
        });

      if (error) {
        console.error('Error creating notification preferences:', error);
        throw new Error('通知設定の作成に失敗しました');
      }
    }
  },

  async filterNotificationsByType(
    userId: string, 
    type: NotificationType
  ): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error filtering notifications:', error);
      throw new Error('通知のフィルタリングに失敗しました');
    }
    return data || [];
  }
};