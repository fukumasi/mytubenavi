// src/hooks/matching/useMatchingPoints.ts

import { useState, useCallback } from 'react';
import { consumePoints as consumePointsUtil, addPoints as addPointsUtil } from '@/utils/pointsUtils';
import { usePoints } from '@/hooks/usePoints';

/**
 * マッチングに関連するポイント管理フック
 */
export function useMatchingPoints(userId: string) {
  const { balance, loading: pointsLoading, fetchBalance: refreshPoints } = usePoints();
  const [processingPoints, setProcessingPoints] = useState(false);

  /**
   * ポイントを消費する
   */
  const consumePoints = useCallback(async (amount: number, reason: string, targetUserId?: string) => {
    if (!userId) return false;
    setProcessingPoints(true);
    try {
      const success = await consumePointsUtil(userId, amount, reason, targetUserId);
      if (success) {
        await refreshPoints();
      }
      return success;
    } catch (error) {
      console.error('ポイント消費エラー:', error);
      return false;
    } finally {
      setProcessingPoints(false);
    }
  }, [userId, refreshPoints]);

  /**
   * ポイントを付与する
   */
  const addPoints = useCallback(async (amount: number, reason: string, targetUserId?: string, description?: string) => {
    if (!userId) return false;
    setProcessingPoints(true);
    try {
      const success = await addPointsUtil(userId, amount, reason, targetUserId, description);
      if (success) {
        await refreshPoints();
      }
      return success;
    } catch (error) {
      console.error('ポイント付与エラー:', error);
      return false;
    } finally {
      setProcessingPoints(false);
    }
  }, [userId, refreshPoints]);

  return {
    balance,
    pointsLoading,
    processingPoints,
    refreshPoints,
    consumePoints,
    addPoints,
  };
}
