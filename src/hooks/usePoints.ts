// src/hooks/usePoints.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TransactionType, PointTransaction as MatchingPointTransaction } from '@/types/matching';
import { pointService } from '@/services/pointService';

// ポイント取引の型（ローカルでの使用）
export type PointTransaction = MatchingPointTransaction;

export type PointBalance = {
  balance: number;
  lifetime_earned: number;
};

export const POINT_COSTS = {
  PROFILE_VIEW: 5,
  REGULAR_MESSAGE: 1,
  HIGHLIGHT_MESSAGE: 10,
  MATCHING_FILTER: 3,
  RECOMMENDED_USERS: 5,
};

/**
 * ポイントシステムを管理するカスタムフック
 */
export const usePoints = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [lifetimeEarned, setLifetimeEarned] = useState<number>(0);

  /**
   * ユーザーがプレミアム会員かどうかを確認
   */
  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // プロフィールからプレミアム情報を取得（premium_untilをpremium_expiryに変更）
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium, premium_expiry')
        .eq('id', user.id)
        .limit(1); // single()の代わりにlimit(1)を使用
      
      if (error) {
        console.error('Error checking premium status:', error);
        return false;
      }
      
      if (!data || data.length === 0) {
        return false;
      }
      
      // プレミアム期限がまだ有効か確認（premium_expiryに変更）
      if (data[0]?.is_premium && data[0]?.premium_expiry) {
        const premiumExpiry = new Date(data[0].premium_expiry);
        const now = new Date();
        
        return premiumExpiry > now;
      }
      
      // is_premiumフラグのみで判断（expiry日がなくてもフラグがtrueなら有効とみなす）
      return !!data[0]?.is_premium;
    } catch (err) {
      console.error('Error in checkPremiumStatus:', err);
      return false;
    }
  }, [user]);

  /**
   * ユーザーのポイント残高を取得
   */
  const fetchBalance = useCallback(async (): Promise<number | null> => {
    if (!user) {
      setBalance(null);
      setLifetimeEarned(0);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // プレミアム状態を確認
      const premium = await checkPremiumStatus();
      setIsPremium(premium);
      
      // ポイントサービスを使用してポイント情報を取得
      try {
        const pointData = await pointService.getUserPoints(user.id);
        setBalance(pointData.balance);
        setLifetimeEarned(pointData.lifetimeEarned);
        return pointData.balance;
      } catch (err) {
        console.error('Error fetching points:', err);
        // エラー時もデフォルト値を設定して表示する
        setBalance(100);
        setLifetimeEarned(0);
        return 100;
      }
    } catch (err) {
      console.error('Error in fetchBalance:', err);
      setError('ポイント残高の取得中にエラーが発生しました');
      // エラー時もUIに表示できるようデフォルト値を設定
      setBalance(100);
      setLifetimeEarned(0);
      return 100;
    } finally {
      setLoading(false);
    }
  }, [user, checkPremiumStatus]);

  /**
   * ポイント残高を更新する（refreshBalance）
   * fetchBalanceのラッパーとして実装
   */
  const refreshBalance = useCallback(async (): Promise<number | null> => {
    return await fetchBalance();
  }, [fetchBalance]);

  /**
   * ユーザーのポイント取引履歴を取得
   */
  const fetchTransactions = useCallback(async (limit: number = 10, offset: number = 0) => {
    if (!user) {
      setTransactions([]);
      return;
    }

    setTransactionsLoading(true);
    setError(null);

    try {
      // 直接取得を試みる
      try {
        const { data, error } = await supabase
          .from('point_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          // テーブルが存在しない可能性
          console.warn('トランザクション履歴が取得できません。テーブルが初期化されていない可能性があります。:', error);
          setTransactions([]);
        } else {
          setTransactions(data || []);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error in fetchTransactions:', err);
      setError('取引履歴の取得中にエラーが発生しました');
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  /**
   * ポイントを消費（プレミアム会員の場合はスキップ）
   * @param amount 消費するポイント量
   * @param transactionType 取引種別
   * @param referenceId 関連するIDがあれば指定
   * @param description 詳細説明
   * @param bypassPremium プレミアム会員でもポイント消費を行うかどうか
   */
  const consumePoints = useCallback(async (
    amount: number,
    transactionType: TransactionType,
    referenceId?: string,
    description?: string,
    bypassPremium: boolean = false
  ): Promise<boolean> => {
    if (!user) {
      setError('ユーザーがログインしていません');
      return false;
    }

    try {
      // ポイントサービスを使用してポイント消費
      const success = await pointService.consumePoints(
        user.id,
        amount,
        transactionType,
        isPremium,
        referenceId,
        description,
        bypassPremium
      );
      
      if (success) {
        // 成功したら状態を更新
        if (isPremium && !bypassPremium) {
          // プレミアム会員で消費をスキップした場合は残高を変更しない
        } else {
          setBalance(prev => prev !== null ? prev - amount : null);
        }
      } else {
        setError('ポイントが不足しているか、消費に失敗しました');
      }
      
      return success;
    } catch (err) {
      console.error('Error in consumePoints:', err);
      setError('ポイント消費中にエラーが発生しました');
      return false;
    }
  }, [user, isPremium]);

  /**
   * ポイントを追加
   * @param amount 追加するポイント量
   * @param transactionType 取引種別
   * @param referenceId 関連するIDがあれば指定
   * @param description 詳細説明
   */
  const addPoints = useCallback(async (
    amount: number,
    transactionType: TransactionType,
    referenceId?: string,
    description?: string
  ): Promise<boolean> => {
    if (!user) {
      setError('ユーザーがログインしていません');
      return false;
    }

    if (amount <= 0) {
      setError('追加ポイントは正の値である必要があります');
      return false;
    }

    try {
      // ポイントサービスを使用してポイント追加
      const success = await pointService.addPoints(
        user.id,
        amount,
        transactionType,
        referenceId,
        description
      );
      
      if (success) {
        // 成功したら状態を更新
        setBalance(prev => prev !== null ? prev + amount : amount);
        setLifetimeEarned(prev => prev + amount);
      } else {
        setError('ポイント追加に失敗しました');
      }
      
      return success;
    } catch (err) {
      console.error('Error in addPoints:', err);
      setError('ポイント追加中にエラーが発生しました');
      return false;
    }
  }, [user]);

  /**
   * レビュー投稿に対するポイント報酬を処理
   * @param reviewContent レビュー内容
   * @param reviewId レビューID
   * @returns 獲得したポイント数
   */
  const processReviewReward = useCallback(async (
    reviewContent: string,
    reviewId: string
  ): Promise<number> => {
    if (!user) {
      setError('ユーザーがログインしていません');
      return 0;
    }
    
    try {
      // ポイントサービスを使用してレビュー報酬を処理
      const points = await pointService.processReviewReward(
        user.id,
        reviewContent,
        reviewId,
        isPremium
      );
      
      if (points > 0) {
        // 成功したら状態を更新（ポイントサービス内でaddPointsは実行済み）
        await refreshBalance();
      }
      
      return points;
    } catch (err) {
      console.error('Error in processReviewReward:', err);
      setError('レビュー報酬の処理中にエラーが発生しました');
      return 0;
    }
  }, [user, isPremium, refreshBalance]);

  /**
   * ポイントを獲得するためのログインボーナスを処理
   * @returns 獲得ポイント数（ボーナスを含む）
   */
  const processLoginBonus = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      // 前回のログイン日を確認
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // ログインテーブルが存在しない可能性があるため、エラー処理を追加
      try {
        // 連続ログイン記録を確認
        const { data, error } = await supabase
          .from('user_logins')
          .select('login_date, streak_count')
          .eq('user_id', user.id)
          .order('login_date', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          // 今日すでにログイン済みの場合はスキップ
          const lastLogin = new Date(data[0].login_date);
          lastLogin.setHours(0, 0, 0, 0);
          
          if (lastLogin.getTime() === today.getTime()) {
            return 0; // 今日はすでにボーナス獲得済み
          }

          // 基本ログインボーナス
          let bonusPoints = 1;
          let streakCount = 1;
          let isStreak = false;
          
          // 連続ログインの確認
          // 昨日ログインしていた場合は連続ログイン
          if (lastLogin.getTime() === yesterday.getTime()) {
            streakCount = (data[0].streak_count || 0) + 1;
            isStreak = true;
            
            // 7日ごとに追加ボーナス
            if (streakCount % 7 === 0) {
              bonusPoints += 5;
            }
          }
          
          // ログイン記録の保存を試みる
          try {
            await supabase.from('user_logins').insert({
              user_id: user.id,
              login_date: today.toISOString(),
              streak_count: streakCount
            });
          } catch (loginError) {
            console.warn('ログイン記録の保存に失敗しました:', loginError);
          }
          
          // 基本ボーナス付与を試みる
          try {
            const success = await addPoints(
              bonusPoints, 
              'login_bonus',
              undefined,
              `ログインボーナス${isStreak ? `（${streakCount}日連続）` : ''}`
            );
            
            return success ? bonusPoints : 0;
          } catch (addError) {
            console.error('ログインボーナスの付与に失敗しました:', addError);
            return 0;
          }
        } else {
          // 最初のログインの場合またはエラーの場合
          // ログイン記録保存を試みる
          try {
            await supabase.from('user_logins').insert({
              user_id: user.id,
              login_date: today.toISOString(),
              streak_count: 1
            });
          } catch (loginError) {
            console.warn('ログイン記録の保存に失敗しました:', loginError);
          }
          
          // 基本ボーナス付与
          const success = await addPoints(1, 'login_bonus', undefined, 'ログインボーナス（初回）');
          return success ? 1 : 0;
        }
      } catch (err) {
        console.warn('ログイン履歴の確認に失敗しました:', err);
      }
      
      // エラーが発生した場合や、テーブルが存在しない場合は基本ボーナスのみ付与
      const success = await addPoints(1, 'login_bonus', undefined, 'ログインボーナス');
      return success ? 1 : 0;
    } catch (err) {
      console.error('Error processing login bonus:', err);
      return 0;
    }
  }, [user, addPoints]);

  /**
   * 特定のアクションにポイントが足りるかチェック
   * @param actionCost アクションのコスト
   */
  const hasEnoughPoints = useCallback(async (actionCost: number): Promise<boolean> => {
    // プレミアム会員は常にtrue
    if (isPremium) return true;
    
    // 非プレミアム会員は残高チェック
    if (balance === null) {
      // バランスが取得できていない場合、更新を試みる
      const currentBalance = await fetchBalance();
      return currentBalance !== null && currentBalance >= actionCost;
    }
    return balance >= actionCost;
  }, [balance, isPremium, fetchBalance]);

  /**
   * ポイント履歴の詳細説明を取得
   */
  const getTransactionDescription = useCallback((transaction: PointTransaction): string => {
    if (transaction.description) {
      return transaction.description;
    }
    
    return pointService.getDefaultDescription(
      transaction.transaction_type, 
      transaction.amount, 
      transaction.amount > 0
    );
  }, []);

  // 初回マウント時およびユーザー変更時にポイント残高を取得
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    lifetimeEarned,
    loading,
    error,
    transactions,
    transactionsLoading,
    isPremium,
    fetchBalance,
    refreshBalance,
    fetchTransactions,
    consumePoints,
    addPoints,
    processReviewReward, // 新しく追加したメソッド
    processLoginBonus,
    hasEnoughPoints,
    getTransactionDescription,
    POINT_COSTS
  };
};

export default usePoints;