// src/hooks/matching/useMatchingActions.ts

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

/**
 * マッチングアクション（いいね・スキップ）専用フック
 * ※仮対応版：likeUser, skipUser本体呼び出しは後で実装する
 */
export function useMatchingActions(userId: string) {
  const [processingAction, setProcessingAction] = useState(false);

  /**
   * いいね処理
   */
  const handleLike = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;
    setProcessingAction(true);
    try {
      console.log(`（仮実装）ユーザー${targetUserId}にいいね`);
      toast.success('いいね！しました');
      return true;
    } catch (error) {
      console.error('いいねエラー:', error);
      toast.error('いいねに失敗しました');
      return false;
    } finally {
      setProcessingAction(false);
    }
  }, [userId]);

  /**
   * スキップ処理
   */
  const handleSkip = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;
    setProcessingAction(true);
    try {
      console.log(`（仮実装）ユーザー${targetUserId}をスキップ`);
      toast.success('スキップしました');
      return true;
    } catch (error) {
      console.error('スキップエラー:', error);
      toast.error('スキップに失敗しました');
      return false;
    } finally {
      setProcessingAction(false);
    }
  }, [userId]);

  /**
   * スキップ取り消し処理
   */
  const undoSkip = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;
    setProcessingAction(true);
    try {
      console.log(`（仮実装）ユーザー${targetUserId}のスキップを取り消し`);
      toast.success('スキップを取り消しました');
      return true;
    } catch (error) {
      console.error('スキップ取り消しエラー:', error);
      toast.error('スキップ取り消しに失敗しました');
      return false;
    } finally {
      setProcessingAction(false);
    }
  }, [userId]);

  return {
    handleLike,
    handleSkip,
    undoSkip,
    processingAction,
  };
}
