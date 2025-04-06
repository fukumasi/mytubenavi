// src/hooks/useNotifications.ts
import { useCallback, useMemo } from 'react';
import { useNotifications as useNotificationsFromContext } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import type { 
  Notification as BaseNotification, 
  NotificationType,
  NotificationAction
} from '../types/notification';

// NotificationPriorityの型定義
export type NotificationPriority = 'high' | 'medium' | 'low';

// Notification型を拡張して独自のプロパティを追加
export interface Notification extends BaseNotification {
  priority: NotificationPriority;
  is_premium_only?: boolean;
}

// 型エクスポートを追加
export type { NotificationType };

/**
 * 通知システムへのアクセスを提供するフック
 * NotificationContextからデータと機能を取得し、プレミアム会員向けの機能を追加します
 * @returns 通知データと操作関数
 */
export function useNotifications() {
  const notificationContext = useNotificationsFromContext();
  const { isPremium, user } = useAuth();
  
  // 通知データの変換（BaseNotification → Notification）
  const notifications = useMemo(() => {
    // データベースからの通知（NotificationContextから）をNotification型に変換
    return (notificationContext.notifications || []).map(notification => ({
      ...notification,
      priority: (notification.priority as NotificationPriority) || 'medium',
      is_premium_only: false
    }));
  }, [notificationContext.notifications]);

  // 通知のフィルタリング（プレミアム会員以外は優先度の低い通知をフィルタリング）
  const filteredNotifications = useMemo(() => {
    if (isPremium) {
      // プレミアム会員はすべての通知を受け取る
      return notifications;
    } else {
      // 非プレミアム会員は重要度の高い通知と特定の種類の通知のみを表示
      return notifications.filter(
        notification => 
          notification.priority === 'high' || 
          notification.type === 'system' || 
          notification.type === 'achievement' ||
          !notification.is_premium_only
      );
    }
  }, [notifications, isPremium]);

  // プレミアム会員向けの通知カウント
  const premiumNotificationsCount = useMemo(() => {
    return notifications.filter(
      notification => notification.is_premium_only
    ).length;
  }, [notifications]);

  // 通知の優先度に基づいて並べ替え
  const sortedNotifications = useMemo(() => {
    return [...filteredNotifications].sort((a, b) => {
      // 未読を優先
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      
      // 優先度によるソート（high → medium → low）
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      const priorityDiff = aPriority - bPriority;
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // 同じ優先度の場合は日付の新しい順
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredNotifications]);

  // 未読通知の数（プレミアムフラグを考慮）
  const unreadCount = useMemo(() => {
    return filteredNotifications.filter(notification => !notification.is_read).length;
  }, [filteredNotifications]);

  // 通知をタイプでグループ化
  const groupByType = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    
    filteredNotifications.forEach(notification => {
      const type = notification.type || 'other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
    });
    
    return groups;
  }, [filteredNotifications]);

  // 通知を優先度でグループ化
  const groupByPriority = useMemo(() => {
    const groups: Record<string, Notification[]> = {
      high: [],
      medium: [],
      low: []
    };
    
    filteredNotifications.forEach(notification => {
      const priority = notification.priority || 'medium';
      groups[priority].push(notification);
    });
    
    return groups;
  }, [filteredNotifications]);

  // 通知を日付でグループ化（今日、昨日、過去7日、それ以前）
  const groupByDate = useMemo(() => {
    const groups: Record<string, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    filteredNotifications.forEach(notification => {
      const notifDate = new Date(notification.created_at);
      notifDate.setHours(0, 0, 0, 0);
      
      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (notifDate >= weekAgo) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });
    
    return groups;
  }, [filteredNotifications]);

  // 通知を取得する関数
  const fetchAllNotifications = useCallback(async () => {
    if (!user) return;
    await notificationContext.fetchNotifications();
  }, [user, notificationContext]);

  // プレミアム会員に限定された関数: すべての通知を取得（フィルタリングなし）
  const getAllNotifications = useCallback(() => {
    if (!isPremium) {
      console.warn('getAllNotifications はプレミアム会員限定の機能です');
      return filteredNotifications;
    }
    return notifications;
  }, [isPremium, notifications, filteredNotifications]);

  // 重要度の高い通知のみを取得する関数
  const getImportantNotifications = useCallback((limit?: number) => {
    const important = filteredNotifications.filter(
      notification => notification.priority === 'high'
    );
    
    return limit ? important.slice(0, limit) : important;
  }, [filteredNotifications]);

  // 通知統計を取得する関数
  const getNotificationStats = useCallback(() => {
    const total = filteredNotifications.length;
    const unread = filteredNotifications.filter(n => !n.is_read).length;
    const highPriority = filteredNotifications.filter(n => n.priority === 'high').length;
    const premiumOnly = filteredNotifications.filter(n => n.is_premium_only).length;
    
    const byType: Record<string, number> = {};
    filteredNotifications.forEach(notification => {
      const type = notification.type || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    return {
      total,
      unread,
      highPriority,
      premiumOnly,
      byType
    };
  }, [filteredNotifications]);

  // 通知プレビューを取得する関数（最新の通知を数件取得）
  const getNotificationPreviews = useCallback((count: number = 3) => {
    return sortedNotifications.slice(0, count);
  }, [sortedNotifications]);

  // プレミアム関連の通知のみを取得する関数
  const getPremiumNotifications = useCallback(() => {
    if (!isPremium) {
      console.warn('getPremiumNotifications はプレミアム会員限定の機能です');
      return [];
    }
    
    return notifications.filter(
      notification => notification.is_premium_only
    );
  }, [isPremium, notifications]);

  // 通知アクションを実行する関数
  const executeNotificationAction = useCallback(async (
    notificationId: string, 
    action: NotificationAction
  ) => {
    if (!user) {
      throw new Error('ユーザーログインが必要です');
    }
    
    try {
      const result = await notificationService.executeNotificationAction(
        notificationId,
        action,
        user.id
      );
      
      // アクション実行後に通知リストを更新
      if (result.success) {
        await fetchAllNotifications();
      }
      
      return result;
    } catch (error) {
      console.error('通知アクション実行エラー:', error);
      throw error;
    }
  }, [user, fetchAllNotifications]);

  // 接続関連の通知を取得（マッチングページ用）
  const getConnectionNotifications = useCallback(() => {
    return filteredNotifications.filter(
      notification => 
        notification.type === 'connection_request' || 
        notification.type === 'connection_accepted' || 
        notification.type === 'connection_rejected'
    );
  }, [filteredNotifications]);

  return {
    ...notificationContext,
    notifications: sortedNotifications,
    unreadCount,
    groupByType,
    groupByPriority, 
    groupByDate,
    isPremiumNotificationsAvailable: isPremium,
    premiumNotificationsCount,
    getAllNotifications,
    getImportantNotifications,
    getNotificationStats,
    getNotificationPreviews,
    getPremiumNotifications,
    executeNotificationAction,
    getConnectionNotifications,
    fetchNotifications: fetchAllNotifications,
    markAsRead: notificationContext.markAsRead,
    markAllAsRead: notificationContext.markAllAsRead,
    // 元のメソッドもエクスポート（デバッグ用）
    originalNotifications: notificationContext.notifications
  };
}

export default useNotifications;