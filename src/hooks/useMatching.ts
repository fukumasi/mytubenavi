// src/hooks/useMatching.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  MatchingUser,
  MatchingPreferences,
  VideoDetails,
  MatchingProfileDetails,
  SkippedUser,
  ActivityLevel,
  ConnectionStatus,
  GenderPreference,
} from '../types/matching';
import {
  fetchMatchCandidates,
  sendLike,
  skipUser,
  undoSkip,
  getMatchingProfile,
  calculateActivityLevel,
  getUserWatchHistory,
  getMatchingPreferences,
  saveMatchingPreferences as saveMatchingPreferencesService,
  getCommonVideos,
  getSkippedUsers as getSkippedUsersService,
  getViewingTrends,
  getCommonFriends,
  checkTableExists,
  createTableIfNotExists,
} from '../services/matchingService';
import { notificationService } from '../services/notificationService';
import { usePoints } from './usePoints';
import { consumePoints, addPoints } from '../utils/pointsUtils';
import type { RealtimeChannel } from '@supabase/supabase-js';

// デバッグ情報の型定義（本番環境では削減）
interface DebugInfo {
  userProfile?: any;
  isPremium?: boolean;
  activityLevel?: number;
  userHistoryCount?: number;
  matchingPreferences?: MatchingPreferences | null;
  candidatesCount?: number;
  fetchTime?: string;
  matchingError?: any;
  enhancedCandidatesCount?: number;
  firstCandidate?: { id: string; username: string } | null;
  errorTime?: string;
  skippedUsersCount?: number;
  preferencesError?: any;
  defaultPreferencesUsed?: boolean;
  // 操作ログ追加
  operationLog?: {
    operation: string;
    startTime?: string;
    endTime?: string;
    status: 'started' | 'completed' | 'failed';
    details?: any;
  }[];
  fetchState?: {
    isFetching: boolean;
    operation: string | null;
    startTime: string | null;
  };
  // 緩和モード情報追加
  relaxedMode?: boolean;
  originalPreferences?: MatchingPreferences | null;
  // Realtimeアップデート情報
  realtimeUpdate?: {
    time: string;
    type: string;
    connectionId?: string;
    status?: ConnectionStatus;
  };
}

// デバッグログの最大保持数
const MAX_DEBUG_LOGS = 50;

// Supabaseのpayloadの型定義
interface ConnectionPayload {
  id?: string;
  user_id?: string;
  connected_user_id?: string;
  status?: ConnectionStatus;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// MatchingUserを拡張した型を定義
interface EnhancedMatchingUser extends MatchingUser {
  connection_id?: string | null;
  connection_status?: ConnectionStatus | undefined;
  is_initiator?: boolean;
}

interface UseMatchingReturn {
  loading: boolean;
  loadingPreferences: boolean;
  loadingDetails: boolean;
  loadingSkippedUsers: boolean;
  processingAction: boolean;
  matchedUsers: EnhancedMatchingUser[];
  noMoreUsers: boolean;
  currentUser: EnhancedMatchingUser | null;
  preferences: MatchingPreferences | null;
  isPremium: boolean;
  pointBalance: number | null;
  pointsLoading: boolean;
  userProfile: any;
  activityLevel: number;
  userHistory: string[];
  detailedProfile: MatchingProfileDetails | null;
  commonVideos: VideoDetails[];
  skippedUsers: SkippedUser[];
  lastFilterCost: number;
  filterAppliedDate: string | null;
  viewingTrends: Record<string, number>;
  commonFriends: any[];
  error: string | null;
  isRelaxedMode: boolean;
  debugInfo: DebugInfo | null;
  isMatchedMode: boolean; // 追加: マッチング済みモードフラグ
  fetchMatchedUsers: (isMatched?: boolean) => Promise<void>; // 修正: isMatchedパラメータを追加
  fetchMatchedOnlyUsers: () => Promise<void>; // 追加: マッチング済みユーザーのみ取得関数
  setIsMatchedMode: (mode: boolean) => void; // 追加: モード切替関数
  fetchPreferences: () => Promise<MatchingPreferences | null>;
  fetchDetailedProfile: (userId: string) => Promise<MatchingProfileDetails | null>;
  getCommonVideos: (targetUserId: string) => Promise<VideoDetails[]>;
  savePreferences: (newPreferences: MatchingPreferences) => Promise<boolean>;
  handleLike: (userId: string) => Promise<boolean>;
  handleSkip: (userId: string) => Promise<boolean>;
  handleUndoSkip: (userId: string) => Promise<boolean>;
  getUserHistory: () => Promise<string[] | null>;
  getSkippedUsers: (limit?: number) => Promise<SkippedUser[]>;
  undoSkip: (userId: string) => Promise<boolean>;
  findSkippedUser: (userId: string) => SkippedUser | undefined;
  restoreSkippedUser: (userId: string) => Promise<boolean>;
  nextUser: () => void;
  getCurrentUser: () => EnhancedMatchingUser | null;
  fetchViewingTrends: (userId: string) => Promise<Record<string, number>>;
  fetchCommonFriends: (userId: string) => Promise<any[]>;
  fetchYouTubeChannelInfo: (userId: string) => Promise<any>;
  likeUser: (userId: string) => Promise<boolean>;
  skipUser: (userId: string) => Promise<boolean>;
  sendConnectionRequest: (userId: string) => Promise<boolean>;
  respondToConnectionRequest: (
    connectionId: string,
    status: ConnectionStatus.CONNECTED | ConnectionStatus.REJECTED
  ) => Promise<boolean>;
  calculateLimit: (customLimit?: number) => number;
  initializeDefaultPreferences: () => Promise<boolean>;
  toggleRelaxedMode: (enableRelaxed: boolean) => void;
  resetError: () => void;
  connectionSubscription: RealtimeChannel | null;
  refreshPoints: () => Promise<number | null>;
  ensureTableExists: (tableName: string) => Promise<boolean>;
  startFetching: (operation: string) => boolean;
  endFetching: (operation: string, success: boolean, details?: any) => void;
  checkFilterUsageReset: () => Promise<void>;
  fetchVerificationLevel: () => Promise<number>;
}

/**
 * マッチング機能のためのカスタムフックを提供します。
 * マッチングユーザーの検索、表示、操作に関する状態管理とアクションを一元管理します。
 *
 * @returns マッチング関連の状態変数とアクション関数
 */
export const useMatching = (): UseMatchingReturn => {
  const { user } = useAuth();
  const { 
    isPremium,
    balance,
    loading: pointsLoading,
    fetchBalance: refreshPoints
  } = usePoints();

  const [loading, setLoading] = useState<boolean>(false);
  const [matchedUsers, setMatchedUsers] = useState<EnhancedMatchingUser[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState<number>(0);
  const [preferences, setPreferences] = useState<MatchingPreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState<boolean>(false);
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [noMoreUsers, setNoMoreUsers] = useState<boolean>(false);
  const [commonVideos, setCommonVideos] = useState<VideoDetails[]>([]);
  const [activityLevel, setActivityLevel] = useState<number>(0);
  const [detailedProfile, setDetailedProfile] = useState<MatchingProfileDetails | null>(null);
  const [userHistory, setUserHistory] = useState<string[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [skippedUsers, setSkippedUsers] = useState<SkippedUser[]>([]);
  const [loadingSkippedUsers, setLoadingSkippedUsers] = useState<boolean>(false);
  const [lastFilterCost, setLastFilterCost] = useState<number>(0);
  const [filterAppliedDate, setFilterAppliedDate] = useState<string | null>(null);
  const [viewingTrends, setViewingTrends] = useState<Record<string, number>>({});
  const [commonFriends, setCommonFriends] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  
  // 緩和モード関連の状態
  const [isRelaxedMode, setIsRelaxedMode] = useState<boolean>(false);
  const [originalPreferences, setOriginalPreferences] = useState<MatchingPreferences | null>(null);
  
  // マッチング済みモードフラグを追加
  const [isMatchedMode, setIsMatchedMode] = useState<boolean>(false);
  
  // connectionSubscription を useRef に変更
  const connectionSubscriptionRef = useRef<RealtimeChannel | null>(null);
  
  // チャンネル初期化フラグを追加
  const channelInitializedRef = useRef<boolean>(false);
  
  // 前回のマッチングユーザーを保持するためのref
  const prevMatchedUsersRef = useRef<EnhancedMatchingUser[]>([]);
  
  // ユーザーIDをrefに保持
  const userIdRef = useRef<string | null>(null);
  
  // 初期化済みフラグを追加
  const initializedRef = useRef<boolean>(false);
  
  // フェッチング状態を追跡するref
  const isFetchingRef = useRef<boolean>(false);
  
  // startFetching と endFetching の実装
  const startFetching = useCallback((operation: string): boolean => {
    if (isFetchingRef.current) {
      console.warn(`Fetching already in progress, skipping: ${operation}`);
      return false;
    }

    isFetchingRef.current = true;

    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => ({
        ...prev,
        fetchState: {
          isFetching: true,
          operation: operation,
          startTime: new Date().toISOString()
        },
        operationLog: [
          ...(prev?.operationLog || []),
          {
            operation: operation,
            startTime: new Date().toISOString(),
            status: 'started',
            details: undefined
          }
        ]
      }));
    }
    return true;
  }, []);

  const endFetching = useCallback((operation: string, success: boolean, details?: any) => {
    isFetchingRef.current = false;

    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => {
        const endTime = new Date().toISOString();
        const status = success ? 'completed' : 'failed';
        const updatedLog = (prev?.operationLog || []).map(log =>
          log.operation === operation && log.status === 'started'
            ? { ...log, endTime, status: status as 'started' | 'completed' | 'failed', details }
            : log
        );

        return {
          ...prev,
          fetchState: {
            isFetching: false,
            operation: null,
            startTime: null
          },
          operationLog: updatedLog
        };
      });
    }
  }, []);

// デバッグ用テーブル作成関数
const ensureTableExists = useCallback(async (tableName: string): Promise<boolean> => {
  try {
    // オプショナルテーブルのリスト
    const optionalTables = ['user_verification', 'profile_views', 'user_filter_usage'];
    
    // オプショナルテーブルの場合は常にtrueを返す（存在確認をスキップ）
    if (optionalTables.includes(tableName)) {
      console.info(`オプショナルテーブル ${tableName} の存在確認をスキップします`);
      return true;
    }
    
    // テーブルが存在するか確認
    const exists = await checkTableExists(tableName);
    
    if (!exists) {
      console.warn(`テーブル ${tableName} が存在しないため、作成を試みます`);
      
      // 重要なテーブルのリスト
      const criticalTables = ['profiles', 'user_likes', 'user_matches', 'user_skips'];
      
      // テーブルが存在しない場合は作成を試みる
      const created = await createTableIfNotExists(tableName);
      
      if (!created) {
        console.error(`テーブル ${tableName} の作成に失敗しました`);
        
        // クリティカルテーブルの場合のみエラーをスロー
        if (criticalTables.includes(tableName)) {
          throw new Error(`重要なテーブル ${tableName} が存在しないか、作成できませんでした。システム管理者に連絡してください。`);
        }
        
        return false;
      }
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error(`テーブル ${tableName} の確認・作成に失敗:`, error);
    
    // profilesテーブルのみエラーをスロー（アプリケーションの中核テーブル）
    if (tableName === 'profiles') {
      throw error;
    }
    
    return false;
  }
}, []);

// fetchUserProfile関数内での修正例
const fetchUserProfile = useCallback(async () => {
  if (!user?.id) return null;
  
  try {
    setError(null);
    startFetching('fetchUserProfile');
    
    // プロファイルテーブルのみ存在確認（他のオプショナルテーブルはskip）
    try {
      const profilesExists = await ensureTableExists('profiles');
      if (!profilesExists) {
        throw new Error('プロフィールテーブルが存在しないか、作成できませんでした');
      }
    } catch (tableError) {
      console.error('プロフィールテーブル確認エラー:', tableError);
      throw new Error('プロフィールテーブルへのアクセスに失敗しました。管理者に連絡してください。');
    }
    
    // プロフィールデータ取得 - single()をlimit(1)に変更
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .limit(1);

    if (fetchError) {
      if (fetchError.code === '42P01') {
        throw new Error('プロフィールテーブルが存在しません。システム管理者に連絡してください。');
      }
      throw fetchError;
    }

    // データが存在するか確認し、配列として処理
    if (!data || data.length === 0) {
      console.error('プロフィールデータが見つかりません:', user.id);
      throw new Error('プロフィールデータが見つかりません');
    }

    const profileData = data[0];
    setUserProfile(profileData);

    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => ({
        ...prev,
        userProfile: profileData,
        isPremium
      }));
    }
    
    endFetching('fetchUserProfile', true, { id: user.id });
    return profileData;
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'プロフィール情報の取得に失敗しました';
    
    console.error('プロフィール情報の取得に失敗しました:', error);
    setError(errorMessage);
    toast.error('プロフィール情報の取得に失敗しました。再読み込みをお試しください。');
    endFetching('fetchUserProfile', false, { error });
    return null;
  }
}, [user?.id, isPremium, startFetching, endFetching, ensureTableExists]);


  /**
   * ユーザーの活動レベルを取得します
   */
  const fetchUserActivityLevel = useCallback(async () => {
    if (!user?.id) return null;
    if (!startFetching('fetchUserActivityLevel')) return null;

    try {
      setError(null);
      const level = await calculateActivityLevel(user.id);
      setActivityLevel(level);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('ユーザー活動レベル:', level);
        setDebugInfo(prev => ({
          ...prev,
          activityLevel: level
        }));
      }
      
      endFetching('fetchUserActivityLevel', true, { level });
      return level;
    } catch (error) {
      console.error('活動レベルの取得に失敗しました:', error);
      setError('活動レベルの取得に失敗しました');
      endFetching('fetchUserActivityLevel', false, { error });
      return null;
    }
  }, [user?.id, isPremium, ensureTableExists, startFetching, endFetching]);

  /**
   * ユーザーの視聴履歴を取得します
   */
  const fetchUserHistory = useCallback(async () => {
    if (!user?.id) return null;
    if (!startFetching('fetchUserHistory')) return null;

    try {
      setError(null);
      
      // view_historyテーブルが存在するか確認
      await ensureTableExists('view_history');
      
      const history = await getUserWatchHistory(user.id, 50);
      setUserHistory(history);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('視聴履歴取得:', history.length, '件');
        setDebugInfo(prev => ({
          ...prev,
          userHistoryCount: history.length
        }));
      }
      
      endFetching('fetchUserHistory', true, { count: history.length });
      return history;
    } catch (error) {
      console.error('視聴履歴の取得に失敗しました:', error);
      setError('視聴履歴の取得に失敗しました');
      endFetching('fetchUserHistory', false, { error });
      return null;
    }
  }, [user?.id, startFetching, endFetching, ensureTableExists]);

  /**
   * ユーザーの視聴傾向を取得します
   */
  const fetchViewingTrends = useCallback(async (userId: string): Promise<Record<string, number>> => {
    if (!startFetching(`fetchViewingTrends-${userId}`)) return {};
    
    try {
      setError(null);
      
      // view_historyテーブルとvideosテーブルが存在するか確認
      await Promise.all([
        ensureTableExists('view_history'),
        ensureTableExists('videos')
      ]);
      
      const trends = await getViewingTrends(userId);
      setViewingTrends(trends);
      
      endFetching(`fetchViewingTrends-${userId}`, true, { count: Object.keys(trends).length });
      return trends;
    } catch (error) {
      console.error('視聴傾向の取得に失敗しました:', error);
      setError('視聴傾向の取得に失敗しました');
      endFetching(`fetchViewingTrends-${userId}`, false, { error });
      return {};
    }
  }, [startFetching, endFetching, ensureTableExists]);

  /**
   * 共通の友達を取得します
   */
  const fetchCommonFriends = useCallback(async (userId: string) => {
    if (!user?.id) return [];
    if (!startFetching(`fetchCommonFriends-${userId}`)) return [];

    try {
      setError(null);
      
      // connectionsテーブルとprofilesテーブルが存在するか確認
      await Promise.all([
        ensureTableExists('connections'),
        ensureTableExists('profiles')
      ]);
      
      const friends = await getCommonFriends(user.id, userId);
      setCommonFriends(friends);
      
      endFetching(`fetchCommonFriends-${userId}`, true, { count: friends.length });
      return friends;
    } catch (error) {
      console.error('共通の友達の取得に失敗しました:', error);
      setError('共通の友達の取得に失敗しました');
      endFetching(`fetchCommonFriends-${userId}`, false, { error });
      return [];
    }
  }, [user?.id, startFetching, endFetching, ensureTableExists]);

  /**
   * YouTubeチャンネル情報を取得します
   */
  const fetchYouTubeChannelInfo = useCallback(async (userId: string) => {
    if (!startFetching(`fetchYouTubeChannelInfo-${userId}`)) return null;
    
    try {
      setError(null);
      
      // youtuber_profilesテーブルの確認はスキップし、プロフィールテーブルのみチェック
      // このアプローチは406エラーを回避します
      await ensureTableExists('profiles');
      
      // まずprofilesテーブルからチャンネル情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('channel_url')
        .eq('id', userId)
        .limit(1);
      
      if (profileError) {
        console.error('プロフィール取得エラー:', profileError);
        endFetching(`fetchYouTubeChannelInfo-${userId}`, false, { error: profileError });
        return null;
      }
      
      if (profileData && profileData.length > 0 && profileData[0].channel_url) {
        endFetching(`fetchYouTubeChannelInfo-${userId}`, true, { source: 'profiles', hasUrl: true });
        return { id: userId, channel_url: profileData[0].channel_url, channel_name: null };
      }
      
      // 次にyoutuber_profilesテーブルを確認（必要な場合のみ）
      try {
        const { data, error: fetchError } = await supabase
          .from('youtuber_profiles')
          .select('id, channel_url, channel_name')
          .eq('id', userId)
          .limit(1);
        
        if (fetchError) {
          console.warn('YouTuberプロフィール取得エラー:', fetchError);
          endFetching(`fetchYouTubeChannelInfo-${userId}`, false, { error: 'No channel URL found' });
          return null;
        }
        
        if (data && data.length > 0 && data[0].channel_url) {
          endFetching(`fetchYouTubeChannelInfo-${userId}`, true, { source: 'youtuber_profiles', hasUrl: true });
          return data[0];
        }
      } catch (err) {
        console.warn('YouTuberプロフィール取得中の例外:', err);
        // エラーを無視して処理を続行（プロフィールからのデータを使用）
      }
      
      endFetching(`fetchYouTubeChannelInfo-${userId}`, false, { error: 'No channel URL found in any table' });
      return null;
    } catch (error) {
      console.error('YouTubeチャンネル情報の取得に失敗しました:', error);
      setError('YouTubeチャンネル情報の取得に失敗しました');
      endFetching(`fetchYouTubeChannelInfo-${userId}`, false, { error });
      return null;
    }
  }, [startFetching, endFetching, ensureTableExists]);
  /**
   * 緩和モードの設定を切り替えます
   */
  const toggleRelaxedMode = useCallback((enableRelaxed: boolean) => {
    // すでに同じモードの場合は何もしない
    if (isRelaxedMode === enableRelaxed) return;
    
    if (enableRelaxed) {
      // 緩和モードをONにする場合
      // 現在の設定を保存
      setOriginalPreferences(preferences);
      
      // 緩和モード用の設定を適用
      const relaxedPrefs: MatchingPreferences = {
        gender_preference: GenderPreference.ANY,
        age_range_min: 18,
        age_range_max: 99,
        location_preference: {},
        interest_tags: preferences?.interest_tags || [],
        genre_preference: [],
        activity_level: ActivityLevel.MODERATE,
        online_only: false,
        premium_only: false,
        has_video_history: false,
        recent_activity: false,
        filter_skipped: false,
        min_common_interests: 0,
        max_distance: 0
      };
      
      setPreferences(relaxedPrefs);
      setIsRelaxedMode(true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('緩和モードをONにしました', relaxedPrefs);
        setDebugInfo(prev => ({
          ...prev,
          relaxedMode: true,
          originalPreferences: preferences
        }));
      }
    } else {
      // 緩和モードをOFFにする場合
      if (originalPreferences) {
        // 保存していた設定を復元
        setPreferences(originalPreferences);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('緩和モードをOFFにしました、元の設定に戻します', originalPreferences);
        }
      }
      
      setIsRelaxedMode(false);
      setOriginalPreferences(null);
      
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(prev => ({
          ...prev,
          relaxedMode: false,
          originalPreferences: null
        }));
      }
    }
  }, [isRelaxedMode, preferences, originalPreferences]);

  /**
   * マッチングユーザーを取得します
   * @param isMatched マッチング済みユーザーのみを取得するかどうか
   */
  const fetchMatchedUsers = useCallback(async (isMatched: boolean = false) => {
    if (!user?.id) return;
    if (!startFetching(`fetchMatchedUsers-${isMatched ? 'matched' : 'candidates'}`)) return;

    setLoading(true);
    setError(null);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`マッチング${isMatched ? '済み' : '候補'}ユーザー取得開始:`, preferences);
        setDebugInfo(prev => ({
          ...prev,
          matchingPreferences: preferences
        }));
      }

      // 必要なテーブルが存在するか確認
      await Promise.all([
        ensureTableExists('profiles'),
        ensureTableExists('user_matching_preferences'),
        ensureTableExists('user_skips'),
        ensureTableExists('user_likes')
      ]);

      // マッチングモードを設定
      setIsMatchedMode(isMatched);

      const prefsToUse = preferences || {
        gender_preference: GenderPreference.ANY,
        age_range_min: 18,
        age_range_max: 99,
        location_preference: { prefecture: undefined, region: undefined },
        interest_tags: [],
        genre_preference: [],
        activity_level: ActivityLevel.MODERATE,
        online_only: false,
        premium_only: false,
        has_video_history: false,
        recent_activity: false,
        filter_skipped: false, // デフォルトでfalseに変更
        min_common_interests: 0,
        max_distance: 0,
        exclude_liked_users: true // 初期状態ではいいね済みユーザーを除外
      };

      let candidates;
      try {
        // isMatchedModeパラメータを明示的に渡す
        const searchPrefs = { ...prefsToUse };
        candidates = await fetchMatchCandidates(user.id, searchPrefs, isMatched);
        
        // 候補が見つからず、いいね済みユーザーが除外されている場合は
        // いいね済みユーザーも含めて再検索（マッチング済みモードでない場合のみ）
        if ((!candidates || candidates.length === 0) && searchPrefs.exclude_liked_users && !isMatched) {
          if (process.env.NODE_ENV === 'development') {
            console.log('通常の検索で候補なし - いいね済みユーザーも含めて再検索します');
          }
          
          const includeLikedPrefs = { 
            ...searchPrefs, 
            exclude_liked_users: false 
          };
          
          candidates = await fetchMatchCandidates(user.id, includeLikedPrefs, isMatched);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`マッチング${isMatched ? '済み' : '候補'}ユーザー取得結果:`, candidates?.length || 0, '件');
          setDebugInfo(prev => ({...prev,
            candidatesCount: candidates?.length || 0,
            fetchTime: new Date().toISOString()
          }));
        }
      } catch (fetchError) {
        console.error('マッチング候補取得エラー:', fetchError);
        if (process.env.NODE_ENV === 'development') {
          setDebugInfo(prev => ({
            ...prev,
            matchingError: fetchError
          }));
        }
        throw fetchError;
      }

      // 候補が見つからない場合のフォールバック処理
      if (!candidates || candidates.length === 0) {
        // マッチング済みモードで候補がない場合は単にメッセージを表示
        if (isMatched) {
          setMatchedUsers([]);
          setNoMoreUsers(true);
          setLoading(false);
          setError('マッチング済みのユーザーがいません。');
          
          if (process.env.NODE_ENV === 'development') {
            console.log("マッチング済みユーザーが見つかりません");
          }
          
          endFetching(`fetchMatchedUsers-${isMatched ? 'matched' : 'candidates'}`, true, { count: 0 });
          return;
        }
        // 通常モードで緩和モードでなければ、緩和モードを提案するエラーを設定
        else if (!isRelaxedMode) {
          setMatchedUsers([]);
          setNoMoreUsers(true);
          setLoading(false);
          // エラーを設定（UIでガイダンスを表示するため）
          setError('マッチング候補が見つかりません。条件緩和モードを試してください。');
          
          if (process.env.NODE_ENV === 'development') {
            console.log("候補なし: 緩和モードを提案");
          }
          
          endFetching(`fetchMatchedUsers-${isMatched ? 'matched' : 'candidates'}`, true, { count: 0, suggestRelaxedMode: true });
          return;
        } else {
          // すでに緩和モードでも候補がない場合は単純に空を返す
          setMatchedUsers([]);
          setNoMoreUsers(true);
          setLoading(false);
          
          if (process.env.NODE_ENV === 'development') {
            console.log("候補なし: 緩和モードでも候補なし");
          }
          
          endFetching(`fetchMatchedUsers-${isMatched ? 'matched' : 'candidates'}`, true, { count: 0, relaxedMode: true });
          return;
        }
      }

      // 接続情報を取得
      let connections: any[] = [];
      try {
        await ensureTableExists('connections');
        
        const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);
        
      if (connectionsError) {
        console.error('接続情報取得エラー:', connectionsError);
         // エラーがあっても処理を続行するため、空の配列をセットする
      } else {
        connections = connectionsData || [];
      }
    } catch (err) {
      console.error('接続情報取得中に例外が発生:', err);
      // 例外が発生した場合も処理を続行するため、空の配列をセットする
    }

    const connectionMap = new Map();
    if (connections && connections.length > 0) {
      connections.forEach(conn => {
        const otherUserId = conn.user_id === user.id ? conn.connected_user_id : conn.user_id;
        connectionMap.set(otherUserId, {
          id: conn.id,
          status: conn.status as ConnectionStatus,
          isInitiator: conn.user_id === user.id
        });
      });
    }

    const enhancedCandidates: EnhancedMatchingUser[] = await Promise.all(
      candidates.map(async (candidate) => {
        const connectionInfo = connectionMap.get(candidate.id);
        const enhancedCandidate: EnhancedMatchingUser = {
          ...candidate,
          connection_id: connectionInfo?.id || null,
          connection_status: connectionInfo?.status,
          is_initiator: connectionInfo?.isInitiator || false
        };

        if (candidate.channel_url) {
          return enhancedCandidate;
        }

        try {
          const channelData = await fetchYouTubeChannelInfo(candidate.id);
          if (channelData && channelData.channel_url) {
            return {
              ...enhancedCandidate,
              channel_url: channelData.channel_url
            };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`ユーザー${candidate.id}のチャンネル情報取得エラー:`, error);
          }
        }

        return enhancedCandidate;
      })
    );
    
    // 前回と同じ結果であれば更新しない（無限ループ防止）
    const candidatesChanged = JSON.stringify(prevMatchedUsersRef.current) !== JSON.stringify(enhancedCandidates);
    
    if (candidatesChanged) {
      setMatchedUsers(enhancedCandidates);
      prevMatchedUsersRef.current = [...enhancedCandidates];
      setCurrentUserIndex(0);
      setNoMoreUsers(false);
    }

    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => ({
        ...prev,
        enhancedCandidatesCount: enhancedCandidates.length,
        firstCandidate: enhancedCandidates[0] ? {
          id: enhancedCandidates[0].id,
          username: enhancedCandidates[0].username
        } : null
      }));
    }
    endFetching(`fetchMatchedUsers-${isMatched ? 'matched' : 'candidates'}`, true, { 
      count: enhancedCandidates.length,
      updated: candidatesChanged,
      relaxedMode: isRelaxedMode,
      isMatchedMode: isMatched
    });
  } catch (error) {
    console.error('マッチングユーザーの取得に失敗しました:', error);
    toast.error('マッチングデータの読み込みに失敗しました');
    setError('マッチングユーザーの取得に失敗しました');
    
    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => ({
        ...prev,
        matchingError: error,
        errorTime: new Date().toISOString()
      }));
    }
    
    endFetching(`fetchMatchedUsers-${isMatched ? 'matched' : 'candidates'}`, false, { error });
  } finally {
    setLoading(false);
  }
}, [user?.id, preferences, fetchYouTubeChannelInfo, startFetching, endFetching, isRelaxedMode, ensureTableExists]);

/**
 * マッチング済みユーザーのみを取得する関数
 */
const fetchMatchedOnlyUsers = useCallback(async () => {
  // マッチング済みモードを指定して取得
  return fetchMatchedUsers(true);
}, [fetchMatchedUsers]);

/**
 * 送信者の名前を取得します
 */
const getSenderInfo = useCallback(async (senderId: string): Promise<string> => {
  try {
    // profilesテーブルが存在するか確認
    const profilesExists = await ensureTableExists('profiles');
    if (!profilesExists) {
      return 'ユーザー';
    }
    
    // single()をlimit(1)に変更
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', senderId)
      .limit(1);
    
    if (error) {
      console.error('送信者情報取得エラー:', error);
      return 'ユーザー';
    }
    
    return data && data.length > 0 ? data[0].username || 'ユーザー' : 'ユーザー';
  } catch (error) {
    console.error('送信者情報取得エラー:', error);
    return 'ユーザー';
  }
}, [ensureTableExists]);

/**
 * 接続状態を現在のマッチングリストに反映する
 */
const updateConnectionStatusInState = useCallback((
  userId: string,
  connectedUserId: string,
  status: ConnectionStatus | undefined,
  connectionId: string | null
) => {
  if (!userIdRef.current) return;

  setMatchedUsers(prevUsers => {
    // マッチングリストが空の場合は更新しない
    if (!prevUsers || prevUsers.length === 0) return prevUsers;
    
    const targetUserId = (userId === userIdRef.current) ? connectedUserId : userId;
    
    // 更新が必要なユーザーが存在するかチェック
    const userNeedsUpdate = prevUsers.some(u => u.id === targetUserId);
    if (!userNeedsUpdate) return prevUsers;
    
    // 更新が必要な場合のみ処理
    const updatedUsers = prevUsers.map(currentUser => {
      if (currentUser.id === targetUserId) {
          const updatedUser: EnhancedMatchingUser = {
              ...currentUser,
              connection_status: status,
              connection_id: connectionId,
          };
          if (process.env.NODE_ENV === 'development') {
            console.log(`ユーザー ${targetUserId} の接続状態を更新: ${status}, ID: ${connectionId}`);
          }
          return updatedUser;
      }
      return currentUser;
    });
    
    // 変更があったか確認
    const hasUpdates = JSON.stringify(updatedUsers) !== JSON.stringify(prevUsers);
    
    // 変更があった場合のみ新しい配列を返す
    if (hasUpdates) {
      prevMatchedUsersRef.current = [...updatedUsers];
      return updatedUsers;
    }

    return prevUsers;
  });
}, []);

/**
 * 接続状態の変更を監視・状態に反映させる
 */
const subscribeToConnectionChanges = useCallback(() => {
  // すでに接続されているか、ユーザーがない場合は何もしない
  if (!user?.id || channelInitializedRef.current) {
    return () => {
      // 既存のクリーンアップのみ返す
    };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('接続状態変更の監視を開始:', user.id);
  }

  // 初期化済みフラグを立てる（重複監視を防止）
  channelInitializedRef.current = true;

  let newSubscription: RealtimeChannel | null = null;
  try {
    newSubscription = supabase
      .channel(`matching-connections-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `or(user_id.eq.${user.id},connected_user_id.eq.${user.id})`
      }, (payload) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('接続状態変更を検知:', payload);
        }

        const newData = payload.new as ConnectionPayload | undefined;
        const oldData = payload.old as ConnectionPayload | undefined;
        const connectionId = newData?.id || oldData?.id;
        const newStatus = newData?.status;
        const userId = newData?.user_id || oldData?.user_id;
        const connectedUserId = newData?.connected_user_id || oldData?.connected_user_id;

        if (!userId || !connectedUserId) {
          console.warn('Realtime payloadに user_id または connected_user_id が不足:', payload);
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          setDebugInfo(prev => ({
            ...prev,
            realtimeUpdate: {
              time: new Date().toISOString(),
              type: payload.eventType,
              connectionId,
              status: newStatus
            }
          }));
        }

        if (payload.eventType === 'UPDATE') {
          const oldStatus = oldData?.status;
          if (oldStatus !== newStatus && newStatus !== undefined) {
            if (newStatus === ConnectionStatus.CONNECTED) {
              toast.success('接続リクエストが承認されました！🎉', { duration: 5000 });
            } else if (newStatus === ConnectionStatus.REJECTED) {
              toast.error('接続リクエストが拒否されました', { duration: 3000 });
            }
            updateConnectionStatusInState(
              userId,
              connectedUserId,
              newStatus,
              connectionId ?? null
            );
          }
        } else if (payload.eventType === 'INSERT' && newStatus !== undefined) {
          if (connectedUserId === user.id && newStatus === ConnectionStatus.PENDING) {
            getSenderInfo(userId).then(senderName => {
              toast.success(`${senderName}から接続リクエストが届きました！`, { duration: 5000 });
            });
          }
          updateConnectionStatusInState(
            userId,
            connectedUserId,
            newStatus,
            connectionId ?? null
          );
        } else if (payload.eventType === 'DELETE') {
          updateConnectionStatusInState(
            userId,
            connectedUserId,
            undefined,
            null
          );
        }
      })
      .subscribe((status, err) => {
        if (err) {
          console.error('Realtime subscription error:', err);
          setError('リアルタイム接続に問題が発生しました。');
          channelInitializedRef.current = false;
          connectionSubscriptionRef.current = null;
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('Realtime subscription status:', status);
          }
          connectionSubscriptionRef.current = newSubscription;
        }
      });
  } catch (error) {
    console.error('Realtimeチャンネル作成エラー:', error);
    channelInitializedRef.current = false;
    return () => {};
  }

  // クリーンアップ関数を返す
  return () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('接続状態変更の監視を終了（cleanup関数から）', user?.id);
    }
    if (newSubscription) {
      try {
        supabase.removeChannel(newSubscription)
          .then(status => {
            if (process.env.NODE_ENV === 'development') {
              console.log("Channel removed with status:", status);
            }
            channelInitializedRef.current = false;
            connectionSubscriptionRef.current = null;
          })
          .catch(err => console.error("Failed to remove channel:", err));
      } catch (error) {
        console.error('Realtimeチャンネル削除エラー:', error);
      }
    }
  };
}, [user?.id, updateConnectionStatusInState, getSenderInfo]);

/**
 * 次のユーザーに進みます
 */
const nextUser = useCallback(() => {
  setDetailedProfile(null);
  setCommonVideos([]);
  setViewingTrends({});
  setCommonFriends([]);
  if (currentUserIndex < matchedUsers.length - 1) {
    setCurrentUserIndex(prevIndex => prevIndex + 1);
    if (process.env.NODE_ENV === 'development') {
      console.log('次のユーザーに進みました', currentUserIndex + 1, '/', matchedUsers.length);
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('これ以上のマッチングユーザーはいません');
    }
    setNoMoreUsers(true);
  }
}, [currentUserIndex, matchedUsers.length]);

/**
 * 現在のユーザーを取得します
 */
const getCurrentUser = useCallback((): EnhancedMatchingUser | null => {
  if (matchedUsers.length === 0 || currentUserIndex >= matchedUsers.length) {
    return null;
  }
  return matchedUsers[currentUserIndex];
}, [matchedUsers, currentUserIndex]);

/**
 * スキップしたユーザーの一覧を取得します
 */
const getSkippedUsers = useCallback(async (limit: number = 10): Promise<SkippedUser[]> => {
  if (!user?.id) return [];
  if (!startFetching('getSkippedUsers')) return [];

  setLoadingSkippedUsers(true);
  setError(null);
  try {
    // user_skipsテーブルが存在するか確認
    await ensureTableExists('user_skips');
    
    const skipped = await getSkippedUsersService(user.id, limit);

    if (process.env.NODE_ENV === 'development') {
      console.log('スキップしたユーザー取得:', skipped.length, '件');
      setDebugInfo(prev => ({
        ...prev,
        skippedUsersCount: skipped.length
      }));
    }

    setSkippedUsers(skipped);

    endFetching('getSkippedUsers', true, { count: skipped.length });
    return skipped;
  } catch (error) {
    console.error('スキップしたユーザーの取得に失敗しました:', error);
    setError('スキップしたユーザーの取得に失敗しました');
    endFetching('getSkippedUsers', false, { error });
    return [];
  } finally {
    setLoadingSkippedUsers(false);
  }
}, [user?.id, startFetching, endFetching, ensureTableExists]);

/**
 * 共通の視聴動画を取得します
 */
const getUserCommonVideos = useCallback(async (targetUserId: string): Promise<VideoDetails[]> => {
  if (!user?.id) return [];
  if (!startFetching(`getUserCommonVideos-${targetUserId}`)) return [];

  setError(null);
  try {
    // view_historyテーブルとvideosテーブルが存在するか確認
    await Promise.all([
      ensureTableExists('view_history'),
      ensureTableExists('videos')
    ]);
    
    const videos = await getCommonVideos(user.id, targetUserId);

    if (process.env.NODE_ENV === 'development') {
      console.log('共通の視聴動画取得:', videos.length, '件');
    }

    setCommonVideos(videos);

    endFetching(`getUserCommonVideos-${targetUserId}`, true, { count: videos.length });
    return videos;
  } catch (error) {
    console.error('共通視聴動画の取得に失敗しました:', error);
    setError('共通視聴動画の取得に失敗しました');
    endFetching(`getUserCommonVideos-${targetUserId}`, false, { error });
    return [];
  }
}, [user?.id, startFetching, endFetching, ensureTableExists]);

/**
 * マッチング設定を取得します
 */
const fetchPreferences = useCallback(async () => {
  if (!user?.id) return null;
  if (!startFetching('fetchPreferences')) return null;

  setLoadingPreferences(true);
  setError(null);
  try {
    // user_matching_preferencesテーブルが存在するか確認
    await ensureTableExists('user_matching_preferences');
    
    const prefs = await getMatchingPreferences(user.id);

    if (process.env.NODE_ENV === 'development') {
      console.log('マッチング設定取得:', prefs);
      setDebugInfo(prev => ({
        ...prev,
        matchingPreferences: prefs
      }));
    }

    setPreferences(prefs);

    // フィルター使用履歴を取得
    try {
      // user_filter_usage テーブルが存在するか確認
      const filterUsageExists = await ensureTableExists('user_filter_usage');
      
      if (filterUsageExists) {
        // テーブルが存在する場合は、フィルター使用履歴を取得
        const { data, error: filterError } = await supabase
          .from('user_filter_usage')
          .select('*')
          .eq('user_id', user.id)
          .order('applied_at', { ascending: false })
          .limit(1);

        if (filterError) {
          console.error('フィルター使用履歴の取得エラー:', filterError);
        } else if (data && data.length > 0) {
          setFilterAppliedDate(data[0].applied_at);
          setLastFilterCost(data[0].points_used || 0);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('フィルター使用履歴取得:', data[0]);
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.log('フィルター使用履歴なし');
        }
      }
    } catch (filterFetchError) {
      console.error('フィルター使用履歴の取得中に例外が発生:', filterFetchError);
    }

    endFetching('fetchPreferences', true, { prefsExists: !!prefs });
    return prefs;
  } catch (error) {
    console.error('マッチング設定の取得に失敗しました:', error);
    toast.error('設定の読み込みに失敗しました');
    setError('マッチング設定の取得に失敗しました');
    
    // テーブルが存在しない場合のフォールバック処理
    const defaultPrefs: MatchingPreferences = {
      gender_preference: GenderPreference.ANY,
      age_range_min: 18,
      age_range_max: 99,
      location_preference: { prefecture: undefined, region: undefined },
      interest_tags: [],
      genre_preference: [],
      activity_level: ActivityLevel.MODERATE,
      online_only: false,
      premium_only: false,
      has_video_history: false,
      recent_activity: false,
      filter_skipped: false, // デフォルトでfalseに変更
      min_common_interests: 0,
      max_distance: 0
    };
    setPreferences(defaultPrefs);

    if (process.env.NODE_ENV === 'development') {
      console.log('デフォルトのマッチング設定を使用:', defaultPrefs);
      setDebugInfo(prev => ({
        ...prev,
        preferencesError: error,
        defaultPreferencesUsed: true
      }));
    }

    endFetching('fetchPreferences', false, { error, defaultUsed: true });
    return defaultPrefs;
  } finally {
    setLoadingPreferences(false);
  }
}, [user?.id, startFetching, endFetching, ensureTableExists]);

/**
 * マッチング設定を保存します
 */
const savePreferences = async (newPreferences: MatchingPreferences): Promise<boolean> => {
  if (!user?.id) return false;
  if (!startFetching('savePreferences')) return false;

  setProcessingAction(true);
  setError(null);
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('マッチング設定保存開始:', newPreferences);
      setDebugInfo(prev => ({
        ...prev,
        savePreferencesStart: { time: new Date().toISOString(), preferences: newPreferences }
      }));
    }

    // user_matching_preferencesテーブルが存在するか確認
    await ensureTableExists('user_matching_preferences');

    // 緩和モード状態更新
    const isRelaxedSettings = 
      newPreferences.gender_preference === GenderPreference.ANY && 
      newPreferences.age_range_min === 18 && 
      newPreferences.age_range_max === 99 &&
      (!newPreferences.location_preference || Object.keys(newPreferences.location_preference).length === 0) &&
      !newPreferences.online_only &&
      !newPreferences.premium_only &&
      !newPreferences.has_video_history &&
      !newPreferences.recent_activity &&
      !newPreferences.filter_skipped &&
      (!newPreferences.min_common_interests || newPreferences.min_common_interests === 0) &&
      (!newPreferences.max_distance || newPreferences.max_distance === 0);
      
    if (isRelaxedSettings !== isRelaxedMode) {
      setIsRelaxedMode(isRelaxedSettings);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`緩和モード状態を${isRelaxedSettings ? 'ON' : 'OFF'}に更新`);
      }
    }

    const detailedFilterActive =
      newPreferences.online_only ||
      newPreferences.premium_only ||
      newPreferences.has_video_history ||
      newPreferences.recent_activity ||
      (newPreferences.min_common_interests !== undefined && newPreferences.min_common_interests > 0) ||
      (newPreferences.max_distance !== undefined && newPreferences.max_distance > 0);

    let pointsConsumedSuccessfully = true;

    if (!isPremium && detailedFilterActive) {
      const today = new Date().toISOString().split('T')[0];
      const alreadyAppliedToday = filterAppliedDate && filterAppliedDate.startsWith(today);

      if (process.env.NODE_ENV === 'development') {
        console.log('詳細フィルター使用:', { isPremium, detailedFilterActive, today, filterAppliedDate, alreadyAppliedToday });
      }

      if (!alreadyAppliedToday) {
        // ポイント消費前にポイント残高を確認
        if (balance !== null && balance < 3) {
          toast.error('ポイントが不足しています。詳細フィルターを使用するには3ポイント必要です。');
          setProcessingAction(false);
          endFetching('savePreferences', false, { reason: 'not_enough_points' });
          return false;
        }
        
        // ポイント消費処理
        pointsConsumedSuccessfully = await consumePoints(
          user.id,
          3, 
          'filter_usage', 
          undefined
        );

        if (!pointsConsumedSuccessfully) {
          toast.error('ポイント消費に失敗しました。後でもう一度お試しください。');
          setProcessingAction(false);
          endFetching('savePreferences', false, { reason: 'points_consumption_failed' });
          return false;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('フィルター使用でポイント消費:', 3);
        }

        try {
          // user_filter_usageテーブルが存在するか確認
          const filterUsageExists = await ensureTableExists('user_filter_usage');
          
          if (filterUsageExists) {
            // テーブルが存在する場合は、使用履歴を記録
            const { error: insertError } = await supabase
              .from('user_filter_usage')
              .insert({ 
                user_id: user.id, 
                applied_at: new Date().toISOString(), 
                filter_type: 'detailed', 
                points_used: 3,
                filter_settings: newPreferences
              });

            if (insertError) {
              console.error('フィルター使用記録エラー:', insertError);
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('フィルター使用記録成功');
              }
              setFilterAppliedDate(new Date().toISOString());
              setLastFilterCost(3);
            }
          }
        } catch (filterRecordError) {
          console.error('フィルター使用記録中に例外が発生:', filterRecordError);
        }
        
        // ポイント残高を更新
        refreshPoints();
      } else if (process.env.NODE_ENV === 'development') {
        console.log('本日すでにフィルターを使用済み。ポイント消費なし');
      }
    }

    if (pointsConsumedSuccessfully) {
      const success = await saveMatchingPreferencesService(user.id, newPreferences);
      if (!success) throw new Error('設定の保存に失敗しました');

      if (process.env.NODE_ENV === 'development') {
        console.log('マッチング設定保存成功');
        setDebugInfo(prev => ({
          ...prev,
          savePreferencesSuccess: { time: new Date().toISOString(), preferences: newPreferences }
        }));
      }

      setPreferences(newPreferences);

      // 新しい設定でマッチングユーザーを再取得
      if (process.env.NODE_ENV === 'development') {
        console.log('新しい設定でマッチングユーザーを再取得します');
      }
      
      // 現在のマッチングモードを維持して再取得
      await fetchMatchedUsers(isMatchedMode);
      
      endFetching('savePreferences', true, { 
        pointsUsed: (!isPremium && detailedFilterActive && !(filterAppliedDate && filterAppliedDate.startsWith(new Date().toISOString().split('T')[0]))) ? 3 : 0,
        isRelaxedMode: isRelaxedSettings
      });
      return true;
    } else {
      endFetching('savePreferences', false, { reason: 'points_consumption_failed' });
      return false;
    }

  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    toast.error('設定の保存に失敗しました');
    setError('設定の保存に失敗しました');
    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => ({
        ...prev,
        savePreferencesError: { time: new Date().toISOString(), error }
      }));
    }

    endFetching('savePreferences', false, { error });
    return false;
  } finally {
    setProcessingAction(false);
  }
};

/**
 * 詳細プロフィール情報を取得します
 */
const fetchDetailedProfile = async (userId: string): Promise<MatchingProfileDetails | null> => {
  if (!user?.id) return null;
  if (!startFetching(`fetchDetailedProfile-${userId}`)) return null;

  setLoadingDetails(true);
  setError(null);

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('詳細プロフィール取得開始 - 対象ユーザー:', userId);
    }
    
    // 必要なテーブルが存在するか確認
    await Promise.all([
      ensureTableExists('profiles'),
      ensureTableExists('user_points'),
      ensureTableExists('youtuber_profiles')
    ]);

    // ポイント消費処理（プレミアム会員は無料）
    let pointsConsumedSuccessfully = true;
    if (!isPremium) {
      // ポイント残高を確認
      if (balance !== null && balance < 5) {
        toast.error('ポイントが不足しています。プロフィール閲覧には5ポイント必要です。');
        setLoadingDetails(false);
        endFetching(`fetchDetailedProfile-${userId}`, false, { reason: 'not_enough_points' });
        return null;
      }
      
      // ポイント消費処理
      pointsConsumedSuccessfully = await consumePoints(
        user.id,
        5, 
        'profile_view', 
        userId
      );
      
      if (!pointsConsumedSuccessfully) {toast.error('ポイント消費に失敗しました。後でもう一度お試しください。');
        setLoadingDetails(false);
        endFetching(`fetchDetailedProfile-${userId}`, false, { reason: 'points_consumption_failed' });
        return null;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('プロフィール閲覧にポイント消費: 5ポイント');
      }
      
      // ポイント残高を更新
      refreshPoints();
    }
 
    if (pointsConsumedSuccessfully) {
      // 詳細プロフィール情報取得
      const profileData = await getMatchingProfile(user.id, userId);
      if (!profileData) {
        throw new Error('プロフィール取得に失敗しました');
      }
      
      // 共通の視聴動画取得
      const videos = await getUserCommonVideos(userId);
      
      // 視聴傾向取得
      const trends = await fetchViewingTrends(userId);
        
      // 共通の友達取得
      const friends = await fetchCommonFriends(userId);
      
      // YouTubeチャンネル情報取得
      let channelUrl = profileData.profile.channel_url;
      if (!channelUrl) {
        try {
          const channelData = await fetchYouTubeChannelInfo(userId);
          if (channelData && channelData.channel_url) {
            channelUrl = channelData.channel_url;
          }
        } catch (err) {
          console.error('YouTubeチャンネル情報の取得に失敗:', err);
        }
      }
      
      // 全データを統合
      const enhancedProfile: MatchingProfileDetails = {
        ...profileData,
        profile: {
          ...profileData.profile,
          viewing_trends: trends,
          common_friends: friends,
          channel_url: channelUrl || profileData.profile.channel_url
        },
        commonVideos: videos
      };
      
      setDetailedProfile(enhancedProfile);
      
      // プロフィール閲覧履歴記録
      try {
        // profile_views テーブルが存在するか確認して、なければ作成
        const profileViewsExists = await ensureTableExists('profile_views');
        
        if (profileViewsExists) {
          // 閲覧履歴を記録
          const { error: insertError } = await supabase
            .from('profile_views')
            .insert({ 
              viewer_id: user.id, 
              viewed_user_id: userId, 
              created_at: new Date().toISOString() 
            });
            
          if (insertError) {
            console.error('プロフィール閲覧記録エラー:', insertError);
          }
        }
      } catch (err) {
        console.error('プロフィール閲覧履歴記録エラー:', err);
      }
      
      endFetching(`fetchDetailedProfile-${userId}`, true, {
        videosCount: videos.length,
        trendsCount: Object.keys(trends).length,
        friendsCount: friends.length
      });
      
      return enhancedProfile;
    }
 
    return null;
  } catch (error) {
    console.error('詳細プロフィール取得失敗:', error);
    toast.error('プロフィールの取得に失敗しました');
    setError('詳細プロフィール取得に失敗しました');
    endFetching(`fetchDetailedProfile-${userId}`, false, { error });
    return null;
  } finally {
    setLoadingDetails(false);
  }
 };
 
 /**
 * スキップしたユーザーを検索します
 */
 const findSkippedUser = useCallback((userId: string): SkippedUser | undefined => {
  return skippedUsers.find(user => user.id === userId);
 }, [skippedUsers]);
 
 /**
 * スキップを取り消してマッチング候補に戻します
 */
 const restoreSkippedUser = async (userId: string): Promise<boolean> => {
  if (!user?.id) return false;
  if (!startFetching(`restoreSkippedUser-${userId}`)) return false;
 
  setProcessingAction(true);
  setError(null);
 
  try {
    // user_skipsテーブルが存在するか確認
    await ensureTableExists('user_skips');
    
    // スキップを取り消す
    const success = await undoSkip(user.id, userId);
 
    if (!success) {
      throw new Error('スキップ取り消しに失敗しました');
    }
 
    // スキップリストを更新
    await getSkippedUsers();
 
    // マッチング候補を再取得
    if (noMoreUsers) {
      await fetchMatchedUsers(isMatchedMode);
    }
 
    toast.success('スキップを取り消しました');
 
    endFetching(`restoreSkippedUser-${userId}`, true);
    return true;
  } catch (error) {
    console.error('スキップ取り消し失敗:', error);
    toast.error('スキップの取り消しに失敗しました');
    setError('スキップの取り消しに失敗しました');
    endFetching(`restoreSkippedUser-${userId}`, false, { error });
    return false;
  } finally {
    setProcessingAction(false);
  }
 };
 
 /**
 * いいねを送信します
 */
 const handleLike = async (userId: string): Promise<boolean> => {
  if (!user?.id) return false;
  if (!startFetching(`handleLike-${userId}`)) return false;
 
  setProcessingAction(true);
  setError(null);
 
  try {
    // user_likesテーブルとuser_matchesテーブルが存在するか確認
    await Promise.all([
      ensureTableExists('user_likes'),
      ensureTableExists('user_matches')
    ]);
    
    // いいね送信
    const result = await sendLike(user.id, userId, isPremium);
 
    if (!result.success) {
      throw new Error(result.error || 'いいねの送信に失敗しました');
    }
 
    // マッチング成立時の処理
    if (result.isMatch) {
      toast.success('マッチングが成立しました！🎉', { duration: 5000 });
      
      // マッチングボーナスポイント付与（プレミアム会員以外）
      if (!isPremium) {
        await addPoints(
          user.id,
          10, 
          'match_bonus', 
          userId, 
          'マッチング成立ボーナス'
        );
        
        // ポイント残高を更新
        refreshPoints();
      }
      
      // 通知送信
      try {
        await notificationService.createMatchingNotification(
          user.id,
          userId,
          getCurrentUser()?.matching_score || 0,
          'match'
        );
      } catch (notifyError) {
        console.error('マッチング通知送信エラー:', notifyError);
      }
    } else {
      // 通常のいいね送信時の処理
      toast.success('いいねを送りました！');
      
      // 通知送信
      try {
        await notificationService.createMatchingNotification(
          user.id,
          userId,
          getCurrentUser()?.matching_score || 0,
          'like'
        );
      } catch (notifyError) {
        console.error('いいね通知送信エラー:', notifyError);
      }
    }
 
    // 次のユーザーに進む
    nextUser();
 
    endFetching(`handleLike-${userId}`, true, { isMatch: result.isMatch });
    return true;
  } catch (error) {
    console.error('いいね送信失敗:', error);
    toast.error('いいねの送信に失敗しました');
    setError('いいねの送信に失敗しました');
    endFetching(`handleLike-${userId}`, false, { error });
    return false;
  } finally {
    setProcessingAction(false);
  }
 };
 
 /**
 * ユーザーをスキップします
 */
 const handleSkip = async (userId: string): Promise<boolean> => {
  if (!user?.id) return false;
  if (!startFetching(`handleSkip-${userId}`)) return false;
 
  setProcessingAction(true);
  setError(null);
 
  try {
    // user_skipsテーブルが存在するか確認
    await ensureTableExists('user_skips');
    
    // スキップ処理
    const success = await skipUser(user.id, userId);
 
    if (!success) {
      throw new Error('スキップ処理に失敗しました');
    }
 
    // スキップ成功時は次のユーザーへ
    nextUser();
 
    // スキップリスト更新（バックグラウンドで）
    getSkippedUsers().catch(err => console.error('スキップリスト更新エラー:', err));
 
    endFetching(`handleSkip-${userId}`, true);
    return true;
  } catch (error) {
    console.error('スキップ処理失敗:', error);
    toast.error('スキップ処理に失敗しました');
    setError('スキップ処理に失敗しました');
    endFetching(`handleSkip-${userId}`, false, { error });
    return false;
  } finally {
    setProcessingAction(false);
  }
 };
 
 /**
 * いいね送信（MatchingSystem.tsx用）
 */
 const likeUser = async (userId: string): Promise<boolean> => {
  return handleLike(userId);
 };
 
 /**
 * 接続リクエスト送信
 */
 const sendConnectionRequest = async (userId: string): Promise<boolean> => {
  if (!user?.id || !isPremium) {
    if (!isPremium) toast.error("接続リクエストの送信はプレミアム会員限定です。");
    return false;
  }
  if (!startFetching(`sendConnectionRequest-${userId}`)) return false;
 
  setProcessingAction(true);
  setError(null);
 
  try {
    // connectionsテーブルが存在するか確認
    await ensureTableExists('connections');
    
    // 通知を作成して接続リクエストを送信
    const notification = await notificationService.createMatchingNotification(
      user.id,
      userId,
      getCurrentUser()?.matching_score || 0,
      'connection_request'
    );
 
    if (!notification) {
      throw new Error('接続リクエスト送信に失敗しました');
    }
 
    toast.success('接続リクエストを送信しました!');
 
    // 状態を更新
    updateConnectionStatusInState(
      user.id,
      userId,
      ConnectionStatus.PENDING,
      notification.id
    );
 
    endFetching(`sendConnectionRequest-${userId}`, true);
    return true;
  } catch (error) {
    console.error('接続リクエスト送信失敗:', error);
    toast.error('接続リクエストの送信に失敗しました');
    setError('接続リクエストの送信に失敗しました');
    endFetching(`sendConnectionRequest-${userId}`, false, { error });
    return false;
  } finally {
    setProcessingAction(false);
  }
 };
 
 /**
 * 接続リクエストの応答
 */
 const respondToConnectionRequest = async (
  connectionId: string,
  status: ConnectionStatus.CONNECTED | ConnectionStatus.REJECTED
 ): Promise<boolean> => {
  if (!user?.id) return false;
  if (!startFetching(`respondToConnectionRequest-${connectionId}`)) return false;
 
  setProcessingAction(true);
  setError(null);
 
  try {
    // connectionsテーブルが存在するか確認
    await ensureTableExists('connections');
    
    // 接続リクエストに応答
    const response = await notificationService.respondToConnectionRequest(connectionId, status);
        
    if (!response || !response.success) {
      throw new Error('接続リクエスト応答に失敗しました');
    }
 
    if (status === ConnectionStatus.CONNECTED) {
      toast.success('接続リクエストを承認しました！');
    } else {
      toast.success('接続リクエストを拒否しました');
    }
 
    endFetching(`respondToConnectionRequest-${connectionId}`, true, { status });
    return true;
  } catch (error) {
    console.error('接続リクエスト応答失敗:', error);
    toast.error('処理に失敗しました');
    setError('接続リクエスト応答に失敗しました');
    endFetching(`respondToConnectionRequest-${connectionId}`, false, { error });
    return false;
  } finally {
    setProcessingAction(false);
  }
 };
 
 /**
 * 表示件数を計算します
 */
 const calculateLimit = useCallback((customLimit?: number): number => {
  if (customLimit) return customLimit;
  return isPremium ? 10 : 3;
 }, [isPremium]);
 
 /**
 * マッチング設定が空の場合にデフォルト設定を初期化する関数
 */
 const initializeDefaultPreferences = async (): Promise<boolean> => {
  if (!user?.id) return false;
  if (!startFetching('initializeDefaultPreferences')) return false;
 
  try {
    // user_matching_preferencesテーブルが存在するか確認
    await ensureTableExists('user_matching_preferences');
    
    const defaultPrefs: MatchingPreferences = {
      gender_preference: GenderPreference.ANY,
      age_range_min: 18,
      age_range_max: 99,
      location_preference: { prefecture: undefined, region: undefined },
      interest_tags: [],
      genre_preference: [],
      activity_level: ActivityLevel.MODERATE,
      online_only: false,
      premium_only: false,
      has_video_history: false,
      recent_activity: false,
      filter_skipped: false,
      min_common_interests: 0,
      max_distance: 0
    };
 
    const success = await saveMatchingPreferencesService(user.id, defaultPrefs);
 
    if (!success) {
      throw new Error('デフォルト設定初期化に失敗しました');
    }
 
    setPreferences(defaultPrefs);
 
    endFetching('initializeDefaultPreferences', true);
    return true;
  } catch (error) {
    console.error('デフォルト設定初期化失敗:', error);
    setError('デフォルト設定の初期化に失敗しました');
    endFetching('initializeDefaultPreferences', false, { error });
    return false;
  }
 };
 
 // フィルター使用状況をリセットする関数
 const checkFilterUsageReset = useCallback(async () => {
  if (!user?.id) return;
 
  try {
    // 最終フィルター適用日を取得
    const lastAppliedDate = filterAppliedDate ? new Date(filterAppliedDate) : null;
    if (!lastAppliedDate) {
      // 適用日がなければ何もしない
      return;
    }
 
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 
    // 最終適用日が今日より前の場合、リセット
    if (lastAppliedDate < todayMidnight) {
      setLastFilterCost(0);
      setFilterAppliedDate(null);
      console.log('フィルター使用状況をリセットしました');
    } else {
      console.log('フィルターはまだ今日使用されています');
    }
  } catch (error) {
    console.error('フィルター使用状況のリセットチェック中にエラーが発生しました:', error);
  }
 }, [user?.id, filterAppliedDate]);
 
 /**
 * 検証レベルを取得します
 */
 const fetchVerificationLevel = useCallback(async () => {
  if (!user?.id) return 1; // デフォルト値
  
  try {
    // eq()を使用してWHERE句を正しく構築
    const { data, error } = await supabase
      .from('user_verification')
      .select('verification_level')
      .eq('user_id', user.id)
      .limit(1);
    
    if (error) {
      console.warn('検証レベル取得エラー:', error);
      
      // テーブルが存在しない場合やその他のエラーの場合は、
      // レコードの作成を試みる
      try {
        await supabase
          .from('user_verification')
          .insert({
            user_id: user.id,
            verification_level: 1,
            email_verified: false,
            phone_verified: false,
            id_verified: false
          });
      } catch (insertError) {
        console.warn('検証レコード作成エラー:', insertError);
      }
      
      return 1; // エラー時はデフォルト値
    }
    
    // データが存在する場合
    if (data && data.length > 0) {
      return data[0].verification_level || 1;
    }
    
    // データが存在しない場合は新規作成
    try {
      await supabase
        .from('user_verification')
        .insert({
          user_id: user.id,
          verification_level: 1,
          email_verified: false,
          phone_verified: false,
          id_verified: false
        });
    } catch (insertError) {
      console.warn('検証レコード作成エラー:', insertError);
    }
    
    return 1; // デフォルト値
  } catch (error) {
    console.error('検証レベル取得例外:', error);
    return 1; // 例外時もデフォルト値
  }
 }, [user?.id]);
 
 // --- useEffect フック群 ---
 // ユーザーが変更されたときのデータ初期化
 useEffect(() => {
  if (user?.id && !initializedRef.current) {
    if (process.env.NODE_ENV === 'development') {
      console.log("初期データ取得開始 (user 変更)");
    }
 
    initializedRef.current = true;
 
    // 複数の非同期処理を並列実行（データ初期化の高速化）
    Promise.all([
      fetchUserProfile().catch(error => {
        console.error("プロフィール取得エラー:", error);
        return null;
      }),
      fetchUserActivityLevel().catch(error => {
        console.error("活動レベル取得エラー:", error);
        return null;
      }),
      fetchUserHistory().catch(error => {
        console.error("視聴履歴取得エラー:", error);
        return null;
      }),
      fetchPreferences().catch(error => {
        console.error("設定取得エラー:", error);
        return null;
      }),
      getSkippedUsers(20).catch(error => {
        console.error("スキップユーザー取得エラー:", error);
        return [];
      }),
      fetchVerificationLevel().catch(error => {
        console.error("検証レベル取得エラー:", error);
        return 1;
      })
    ]).then(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log("初期データ取得完了");
      }
    }).catch(err => {
      console.error("初期データ取得エラー:", err);
    });
  } else if (!user?.id) {
    // ユーザーがログアウトしたら初期化フラグをリセット
    initializedRef.current = false;
  }
 }, [user?.id, fetchUserProfile, fetchUserActivityLevel, fetchUserHistory, fetchPreferences, getSkippedUsers, fetchVerificationLevel]);
 
 // 設定取得後のマッチングユーザー取得
 useEffect(() => {
  // 設定が読み込まれた後、ユーザーがログインしている場合のみ実行
  if (user?.id && preferences && !isFetchingRef.current) {
    // マッチングユーザーがまだ取得されていない場合のみ実行
    if (!prevMatchedUsersRef.current.length) {
      if (process.env.NODE_ENV === 'development') {
        console.log('設定取得完了、マッチングユーザー取得開始 (preferences 変更)');
      }
      
      // マッチングユーザーを取得する処理を1回だけ実行
      const timer = setTimeout(() => {
        fetchMatchedUsers(isMatchedMode).catch(error => {
          console.error("マッチングユーザー取得エラー:", error);
        });
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }
 }, [user?.id, preferences, fetchMatchedUsers, isMatchedMode]);
 
 // 接続状態変更の監視セットアップ
 useEffect(() => {
  if (user?.id && !channelInitializedRef.current) {
    if (process.env.NODE_ENV === 'development') {
      console.log("接続状態変更の監視セットアップ");
    }
 
    // 監視をセットアップして、クリーンアップ関数を取得
    const cleanup = subscribeToConnectionChanges();
 
    // コンポーネントのアンマウント時にクリーンアップを実行
    return cleanup;
  }
 }, [user?.id, subscribeToConnectionChanges]);
 
 // 日付変更チェックのインターバル設定
 useEffect(() => {
  // 初回実行
  checkFilterUsageReset();
 
  // 60分ごとにチェック
  const interval = setInterval(() => {
    checkFilterUsageReset();
  }, 60 * 60 * 1000);
 
  // クリーンアップ関数を返す
  return () => {
    clearInterval(interval);
  };
 }, [checkFilterUsageReset]);
 
 // ページアンロード時の処理
 useEffect(() => {
  const handleBeforeUnload = () => {
    // 必要に応じて購読解除などのクリーンアップ
    if (connectionSubscriptionRef.current) {
      try {
        connectionSubscriptionRef.current.unsubscribe();
      } catch (error) {
        console.error('購読解除エラー:', error);
      }
    }
  };
 
  window.addEventListener('beforeunload', handleBeforeUnload);
 
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
 }, []);
 
 // デバッグ情報の制限（メモリリーク防止）
 useEffect(() => {
  if (process.env.NODE_ENV === 'development' && debugInfo) {
    const operationLog = debugInfo.operationLog;
    if (operationLog && operationLog.length > MAX_DEBUG_LOGS * 1.5) {
      // ログが制限の1.5倍を超えたらトリミング
      setDebugInfo(prev => {
        if (!prev) return null;
        return {
          ...prev,
          operationLog: prev.operationLog?.slice(-MAX_DEBUG_LOGS) || []
        };
      });
    }
  }
 }, [debugInfo]);
 
 // --- フックの戻り値 ---
 return {
  loading,
  loadingPreferences,
  loadingDetails,
  loadingSkippedUsers,
  processingAction,
  matchedUsers,
  noMoreUsers,
  currentUser: getCurrentUser(),
  preferences,
  isPremium,
  pointBalance: balance,
  pointsLoading,
  userProfile,
  activityLevel,
  userHistory,
  detailedProfile,
  commonVideos,
  skippedUsers,
  lastFilterCost,
  filterAppliedDate,
  viewingTrends,
  commonFriends,
  error,
  isRelaxedMode,
  isMatchedMode, // 追加：マッチング済みモード状態を返す
  debugInfo: process.env.NODE_ENV === 'development' ? debugInfo : null,
  fetchMatchedUsers, // 修正：isMatchedパラメータを受け付けるように修正
  fetchMatchedOnlyUsers, // 追加：マッチング済みユーザーのみ取得関数
  setIsMatchedMode, // 追加：モード切替関数
  fetchPreferences,
  fetchDetailedProfile,
  getCommonVideos: getUserCommonVideos,
  savePreferences,
  handleLike,
  handleSkip,
  handleUndoSkip: restoreSkippedUser,
  getUserHistory: fetchUserHistory,
  getSkippedUsers,
  undoSkip: restoreSkippedUser,
  findSkippedUser,
  restoreSkippedUser,
  nextUser,
  getCurrentUser,
  fetchViewingTrends,
  fetchCommonFriends,
  fetchYouTubeChannelInfo,
  likeUser,
  skipUser: handleSkip,
  sendConnectionRequest,
  respondToConnectionRequest,
  calculateLimit,
  initializeDefaultPreferences,
  toggleRelaxedMode,
  resetError: () => setError(null),
  connectionSubscription: connectionSubscriptionRef.current,
  refreshPoints,
  ensureTableExists,
  startFetching,
  endFetching,
  checkFilterUsageReset,
  fetchVerificationLevel
 };
 };
 
 export default useMatching;