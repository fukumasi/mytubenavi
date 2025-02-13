// src/services/notificationService.ts
import { supabase } from '../lib/supabase';
import { 
 Notification, 
 NotificationPreferences, 
 NotificationType 
} from '../types/notification';

export const notificationService = {
 async getNotifications(userId: string): Promise<Notification[]> {
   const { data, error } = await supabase
     .from('notifications')
     .select('*')
     .eq('userId', userId)
     .order('createdAt', { ascending: false });

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
     .eq('userId', userId)
     .eq('isRead', false);

   if (error) {
     console.error('Error getting unread count:', error);
     throw new Error('未読数の取得に失敗しました');
   }
   return count || 0;
 },

 async markAsRead(notificationId: string): Promise<void> {
   const { error } = await supabase
     .from('notifications')
     .update({ 
       isRead: true,
       updatedAt: new Date().toISOString(),
       readAt: new Date().toISOString()
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
           channel.track({ notificationId, status: 'read' });
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
       isRead: true,
       updatedAt: timestamp,
       readAt: timestamp
     })
     .eq('userId', userId)
     .eq('isRead', false);

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
           channel.track({ userId, status: 'all_read' });
         }
       )
       .subscribe();
   } catch (error) {
     console.error('Error syncing bulk read status:', error);
   }
 },

 async createNotification(
   notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>
 ): Promise<Notification> {
   const timestamp = new Date().toISOString();
   const newNotification = {
     ...notification,
     createdAt: timestamp,
     updatedAt: timestamp,
     readAt: null
   };

   const { data, error } = await this.batchCreateNotifications([newNotification]);

   if (error) {
     console.error('Error creating notification:', error);
     throw new Error('通知の作成に失敗しました');
   }
   return data[0];
 },

 async batchCreateNotifications(
   notifications: Array<Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>>
 ): Promise<{ data: Notification[], error: Error | null }> {
   const timestamp = new Date().toISOString();
   const batchNotifications = notifications.map(notification => ({
     ...notification,
     createdAt: timestamp,
     updatedAt: timestamp,
     readAt: null
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

 async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
   const { data, error } = await supabase
     .from('notification_preferences')
     .select('*')
     .eq('userId', userId)
     .single();

   if (error) {
     console.error('Error fetching notification preferences:', error);
     throw new Error('通知設定の取得に失敗しました');
   }
   return data;
 },

 async updateNotificationPreferences(
   userId: string, 
   preferences: Partial<NotificationPreferences>
 ): Promise<void> {
   const { error } = await supabase
     .from('notification_preferences')
     .upsert({
       userId,
       ...preferences,
       updatedAt: new Date().toISOString()
     });

   if (error) {
     console.error('Error updating notification preferences:', error);
     throw new Error('通知設定の更新に失敗しました');
   }
 },

 async filterNotificationsByType(
   userId: string, 
   type: NotificationType
 ): Promise<Notification[]> {
   const { data, error } = await supabase
     .from('notifications')
     .select('*')
     .eq('userId', userId)
     .eq('type', type)
     .order('createdAt', { ascending: false });

   if (error) {
     console.error('Error filtering notifications:', error);
     throw new Error('通知のフィルタリングに失敗しました');
   }
   return data || [];
 }
};