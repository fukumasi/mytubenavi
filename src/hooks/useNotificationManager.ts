// src/hooks/useNotificationManager.ts
import { useNotifications } from './useNotifications';

// この古いフックは、新しいuseNotificationsに転送するだけのラッパーとして機能します
export const useNotificationManager = () => {
 // 新しい通知システムからすべての機能を取得
 const notificationsContext = useNotifications();
 
 // NotificationContextの機能とuseNotificationManagerの互換性を保つ
 return {
   notifications: notificationsContext.notifications,
   loading: notificationsContext.loading,
   error: notificationsContext.error,
   unreadCount: notificationsContext.unreadCount,
   preferences: null, // 新システムではgetPreferencesで非同期に取得
   isConnected: true, // 新しい実装では常に接続されているとみなす
   createNotification: async () => null, // 直接作成はサポートされなくなった
   markAsRead: notificationsContext.markAsRead,
   markAllAsRead: notificationsContext.markAllAsRead,
   deleteNotification: notificationsContext.deleteNotification,
   updatePreferences: notificationsContext.updateNotificationPreferences,
   refetch: notificationsContext.fetchNotifications,
   // 新しいAPIを追加して移行をサポート
   getPreferences: notificationsContext.getPreferences,
 };
};

export default useNotificationManager;