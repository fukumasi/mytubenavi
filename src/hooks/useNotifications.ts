// src/hooks/useNotifications.ts
import { useCallback, useMemo } from 'react';
import { useNotifications as useNotificationsFromContext } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import type { 
  Notification, 
  NotificationType 
} from '../types/notification';

// NotificationPriorityの型定義
export type NotificationPriority = 'high' | 'medium' | 'low';

// EnhancedNotificationの型を追加
export interface EnhancedNotification extends Notification {
  priority?: NotificationPriority;
  is_premium_only?: boolean;
}

// 型エクスポートを追加（通知関連のコンポーネントで使用するため）
export type { Notification, NotificationType };

/**
 * 通知システムへのアクセスを提供するフック
 * NotificationContextからデータと機能を取得し、プレミアム会員向けの機能を追加します
 * @returns 通知データと操作関数
 */
export function useNotifications() {
  const notificationContext = useNotificationsFromContext();
  const { isPremium } = useAuth();
  
  // 通知のフィルタリング（プレミアム会員以外は優先度の低い通知をフィルタリング）
  const notifications = useMemo(() => {
    if (isPremium) {
      // プレミアム会員はすべての通知を受け取る
      return notificationContext.notifications;
    } else {
      // 非プレミアム会員は重要度の高い通知と特定の種類の通知のみを表示
      return notificationContext.notifications.filter(
        notification => 
          notification.priority === 'high' || 
          notification.type === 'system' || 
          notification.type === 'achievement' ||
          !notification.is_premium_only
      );
    }
  }, [notificationContext.notifications, isPremium]);

  // プレミアム会員向けの通知カウント
  const premiumNotificationsCount = useMemo(() => {
    return notificationContext.notifications.filter(
      notification => notification.is_premium_only
    ).length;
  }, [notificationContext.notifications]);

  // 通知の優先度に基づいて並べ替え
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      // 未読を優先
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      
      // 優先度によるソート（high → medium → low）
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      
      const aPriority = priorityOrder[a.priority || 'medium'] || 1;
      const bPriority = priorityOrder[b.priority || 'medium'] || 1;
      const priorityDiff = aPriority - bPriority;
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // 同じ優先度の場合は日付の新しい順
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notifications]);

  // 未読通知の数（プレミアムフラグを考慮）
  const unreadCount = useMemo(() => {
    return notifications.filter(notification => !notification.is_read).length;
  }, [notifications]);

  // 通知をタイプでグループ化
  const groupByType = useMemo(() => {
    const groups: Record<string, EnhancedNotification[]> = {};
    
    notifications.forEach(notification => {
      const type = notification.type || 'other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification as EnhancedNotification);
    });
    
    return groups;
  }, [notifications]);

  // 通知を優先度でグループ化
  const groupByPriority = useMemo(() => {
    const groups: Record<string, EnhancedNotification[]> = {
      high: [],
      medium: [],
      low: []
    };
    
    notifications.forEach(notification => {
      const priority = notification.priority || 'medium';
      groups[priority].push(notification as EnhancedNotification);
    });
    
    return groups;
  }, [notifications]);

  // 通知を日付でグループ化（今日、昨日、過去7日、それ以前）
  const groupByDate = useMemo(() => {
    const groups: Record<string, EnhancedNotification[]> = {
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
    
    notifications.forEach(notification => {
      const notifDate = new Date(notification.created_at);
      notifDate.setHours(0, 0, 0, 0);
      
      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notification as EnhancedNotification);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification as EnhancedNotification);
      } else if (notifDate >= weekAgo) {
        groups.thisWeek.push(notification as EnhancedNotification);
      } else {
        groups.older.push(notification as EnhancedNotification);
      }
    });
    
    return groups;
  }, [notifications]);

  // プレミアム会員に限定された関数: すべての通知を取得（フィルタリングなし）
  const getAllNotifications = useCallback(() => {
    if (!isPremium) {
      console.warn('getAllNotifications はプレミアム会員限定の機能です');
      return notifications;
    }
    return notificationContext.notifications;
  }, [isPremium, notificationContext.notifications, notifications]);

  // 重要度の高い通知のみを取得する関数
  const getImportantNotifications = useCallback((limit?: number) => {
    const important = notifications.filter(
      notification => notification.priority === 'high'
    );
    
    return limit ? important.slice(0, limit) : important;
  }, [notifications]);

  // 通知統計を取得する関数
  const getNotificationStats = useCallback(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const highPriority = notifications.filter(n => n.priority === 'high').length;
    const premiumOnly = notifications.filter(n => n.is_premium_only).length;
    
    const byType: Record<string, number> = {};
    notifications.forEach(notification => {
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
  }, [notifications]);

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
    
    return notificationContext.notifications.filter(
      notification => notification.is_premium_only
    );
  }, [isPremium, notificationContext.notifications]);

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
    getPremiumNotifications
  };
}

export default useNotifications;