// src/hooks/matching/useMatchingCore.ts

import { useAuth } from '@/contexts/AuthContext';
import { useMatchingSettings } from './useMatchingSettings';
import { useMatchingCandidates } from './useMatchingCandidates';
import { useMatchingProfile } from './useMatchingProfile';
import { useMatchingActions } from './useMatchingActions';
import { useMatchingRealtime } from './useMatchingRealtime';
import { useMatchingPoints } from './useMatchingPoints';

/**
 * マッチング機能を統合したカスタムフック
 */
export default function useMatchingCore() {
  const { user } = useAuth();
  const userId = user?.id || '';

  // 設定管理
  const {
    preferences,
    isRelaxedMode,
    loadingPreferences,
    fetchPreferences,
    savePreferences,
    toggleRelaxedMode,
    initializeDefaultPreferences,
  } = useMatchingSettings(userId);

  // 候補取得
  const {
    candidates,
    loadingCandidates,
    loadCandidates,
  } = useMatchingCandidates({
    userId,
    fetchPreferences,
    initializeDefaultPreferences,
    isRelaxedMode,
    toggleRelaxedMode,
    matchedOnly: false,
  });

  // 詳細プロフィール
  const {
    detailedProfile,
    commonVideos,
    viewingTrends,
    commonFriends,
    loadingProfile,
    fetchDetailedProfile,
  } = useMatchingProfile(userId);

  // アクション（いいね・スキップ）
  const {
    handleLike,
    handleSkip,
    undoSkip,
    processingAction,
  } = useMatchingActions(userId);

  // ポイント管理
  const {
    balance,
    pointsLoading,
    processingPoints,
    refreshPoints,
    consumePoints,
    addPoints,
  } = useMatchingPoints(userId);

  // リアルタイム監視
  const {
    subscribeToConnectionChanges,
    connectionSubscriptionRef,
  } = useMatchingRealtime(userId);

  return {
    userId,
    preferences,
    isRelaxedMode,
    loadingPreferences,
    fetchPreferences,
    savePreferences,
    toggleRelaxedMode,
    initializeDefaultPreferences,

    candidates,
    loadingCandidates,
    loadCandidates,

    detailedProfile,
    commonVideos,
    viewingTrends,
    commonFriends,
    loadingProfile,
    fetchDetailedProfile,

    handleLike,
    handleSkip,
    undoSkip,
    processingAction,

    balance,
    pointBalance: balance, // ★ 追加！これでpointBalanceとしても受け取れる！
    pointsLoading,
    processingPoints,
    refreshPoints,
    consumePoints,
    addPoints,

    subscribeToConnectionChanges,
    connectionSubscriptionRef,
  };
}
