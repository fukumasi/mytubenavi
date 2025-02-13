// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
 Notification as NotificationType,
 NotificationType as NotificationTypeValue, // 型名を修正
 NotificationPreferences
} from '../types/notification';

interface NotificationContextType {
 notifications: NotificationType[];
 unreadCount: number;
 loading: boolean;
 error: string | null;
 markAsRead: (id: string) => Promise<void>;
 markAllAsRead: () => Promise<void>;
 fetchNotifications: () => Promise<void>;
 deleteNotification: (id: string) => Promise<void>;
 clearNotifications: () => Promise<void>;
 filterNotifications: (type?: NotificationTypeValue) => NotificationType[]; // 型名を修正
 updateNotificationPreferences: (preferences: NotificationPreferences) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
 const [notifications, setNotifications] = useState<NotificationType[]>([]); // 型名を修正
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
       .eq('userId', user.id)
       .order('createdAt', { ascending: false });

     if (fetchError) throw fetchError;
     setNotifications(data as NotificationType[] || []); // 型をアサート
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
         isRead: true,
         updatedAt: new Date().toISOString()
       })
       .eq('id', id);

     if (updateError) throw updateError;

     setNotifications(prev =>
       prev.map(notification =>
         notification.id === id
           ? {
               ...notification,
               isRead: true,
               updatedAt: new Date().toISOString()
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
         isRead: true,
         updatedAt: new Date().toISOString()
       })
       .eq('userId', user.id)
       .eq('isRead', false);

     if (updateError) throw updateError;

     setNotifications(prev =>
       prev.map(notification => ({
         ...notification,
         isRead: true,
         updatedAt: new Date().toISOString()
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
       .eq('userId', user.id)
       .eq('isRead', true);

     if (deleteError) throw deleteError;

     setNotifications(prev => prev.filter(notification => !notification.isRead));
   } catch (err) {
     console.error('通知のクリアに失敗:', err);
     setError('通知のクリアに失敗しました');
     throw err;
   }
 };

 const filterNotifications = (type?: NotificationTypeValue) => { // 型名を修正
   if (!type) return notifications;
   return notifications.filter(notification => notification.type === type);
 };

 const updateNotificationPreferences = async (preferences: NotificationPreferences) => {
   try {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;

     const { error: updateError } = await supabase
       .from('notification_preferences')
       .upsert({
         ...preferences,
         updatedAt: new Date().toISOString()
       });

     if (updateError) throw updateError;
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
           filter: `userId=eq.${user.id}`
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

   return () => {
     if (channel) {
       channel.unsubscribe();
     }
   };
 }, [fetchNotifications]);

 const unreadCount = notifications.filter(n => !n.isRead).length;

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