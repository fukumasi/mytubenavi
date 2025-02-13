// src/types/notification.ts

export enum NotificationType {
  Comment = 'comment',
  Rating = 'rating',
  Favorite = 'favorite',
  NewVideo = 'new_video',
  System = 'system',
  Mention = 'mention',
  Follow = 'follow',
  Achievement = 'achievement',
  Recommendation = 'recommendation',
  Milestone = 'milestone',
  Subscription = 'subscription'
 }
 
 export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  link?: string;
  metadata?: NotificationMetadata;
  priority: 'high' | 'medium' | 'low';
  actionTaken: boolean;
  senderId?: string;
  notificationGroup?: string;
  expirationDate?: Date | string;
  displayDuration?: number;
 }
 
 export interface NotificationMetadata {
  videoId?: string;
  commentId?: string;
  ratingId?: string;
  userId?: string;
  reviewId?: string;
  achievementId?: string;
  milestoneId?: string;
  subscriptionId?: string;
  recommendationData?: {
    source: string;
    confidenceScore: number;
  };
  interactionHistory?: {
    lastInteraction: string;
    interactionCount: number;
  };
  additionalData?: Record<string, unknown>;
 }
 
 export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  notificationTypes: {
    comments: boolean;
    ratings: boolean;
    favorites: boolean;
    newVideos: boolean;
    mentions: boolean;
    follows: boolean;
    achievements: boolean;
    recommendations: boolean;
    milestones: boolean;
    subscriptions: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
  };
  frequencySettings: {
    maxNotificationsPerDay: number;
    batchNotifications: boolean;
    batchIntervalMinutes: number;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
 }
 
 export interface NotificationBatchSettings {
  enabled: boolean;
  maxBatchSize: number;
  deliveryInterval: number;
  priorityThreshold: 'high' | 'medium' | 'low';
 }
 
 export interface NotificationChannelConfig {
  email: {
    enabled: boolean;
    templateId?: string;
  };
  push: {
    enabled: boolean;
    platformSettings?: {
      ios?: boolean;
      android?: boolean;
      web?: boolean;
    };
  };
  inApp: {
    enabled: boolean;
    displayDuration?: number;
  };
 }