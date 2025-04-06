// src/hooks/usePoints.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TransactionType, PointTransaction as MatchingPointTransaction } from '../types/matching';

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
        .single();
      
      if (error) {
        console.error('Error checking premium status:', error);
        return false;
      }
      
      // プレミアム期限がまだ有効か確認（premium_expiryに変更）
      if (data?.is_premium && data?.premium_expiry) {
        const premiumExpiry = new Date(data.premium_expiry);
        const now = new Date();
        
        return premiumExpiry > now;
      }
      
      // is_premiumフラグのみで判断（expiry日がなくてもフラグがtrueなら有効とみなす）
      return !!data?.is_premium;
    } catch (err) {
      console.error('Error in checkPremiumStatus:', err);
      return false;
    }
  }, [user]);

  /**
   * テーブルの作成を試みる（フロントエンドからの作成は理想的ではないが、
   * 今回はフォールバック対応として実装。本来はマイグレーションで対応すべき）
   */
  const createDefaultUserPoint = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // ユーザーポイントテーブルが存在することを前提に、レコードの作成を試みる
      const { error } = await supabase
        .from('user_points')
        .insert({
          user_id: user.id,
          balance: 100,  // デフォルト初期ポイント
          lifetime_earned: 0,
          last_updated: new Date().toISOString()
        });
      
      // エラーがなければ作成成功
      return !error;
    } catch (err) {
      console.error('Error creating default user point:', err);
      return false;
    }
  }, [user]);

  /**
   * ユーザーのポイント残高を取得
   */
  const fetchBalance = useCallback(async (): Promise<number | null> => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // プレミアム状態を確認
      const premium = await checkPremiumStatus();
      setIsPremium(premium);
      
      // テーブルの存在確認は行わず、直接ポイント取得を試みる
      try {
        // user_pointsテーブルからユーザーのポイントを取得
        const { data, error } = await supabase
          .from('user_points')
          .select('balance, lifetime_earned')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          // テーブルが存在しないか、ユーザーのレコードがない可能性
          // デフォルトのポイントレコードを作成
          const created = await createDefaultUserPoint();
          
          if (created) {
            // 作成成功したら、デフォルト値をセット
            setBalance(100);
            return 100;
          } else {
            // 失敗した場合も、UI表示のためにデフォルト値を使用
            setBalance(100);
            console.warn('ポイントシステムが初期化されていません。デフォルト値を使用します。');
            return 100;
          }
        } else {
          // データが取得できた場合
          setBalance(data?.balance || 0);
          return data?.balance || 0;
        }
      } catch (err) {
        console.error('Error fetching points:', err);
        // エラー時もデフォルト値を設定して表示する
        setBalance(100);
        return 100;
      }
    } catch (err) {
      console.error('Error in fetchBalance:', err);
      setError('ポイント残高の取得中にエラーが発生しました');
      // エラー時もUIに表示できるようデフォルト値を設定
      setBalance(100);
      return 100;
    } finally {
      setLoading(false);
    }
  }, [user, checkPremiumStatus, createDefaultUserPoint]);

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
      // テーブルの存在確認は行わず、直接取得を試みる
      try {
        const { data, error } = await supabase
          .from('point_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          // テーブルが存在しない可能性
          console.warn('トランザクション履歴が取得できません。テーブルが初期化されていない可能性があります。');
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

    // プレミアム会員はポイント消費をスキップ（bypassPremiumがtrueの場合を除く）
    if (isPremium && !bypassPremium) {
      // プレミアム会員は常に成功として扱う
      return true;
    }

    try {
      // ポイント残高チェック
      if (balance === null || balance < amount) {
        setError('ポイントが不足しています');
        return false;
      }
      
      try {
        // user_pointsテーブルの更新
        const { error: updateError } = await supabase
          .from('user_points')
          .update({
            balance: balance - amount,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        if (updateError) {
          // 更新に失敗した場合、レコードが存在しない可能性があるため作成を試みる
          const { error: insertError } = await supabase
            .from('user_points')
            .insert({
              user_id: user.id,
              balance: 100 - amount, // デフォルト100から消費
              lifetime_earned: 0,
              last_updated: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('Error creating user points record:', insertError);
            setError('ポイント消費に失敗しました');
            return false;
          }
        }
        
        // トランザクション記録の追加を試みる
        try {
          await supabase
            .from('point_transactions')
            .insert({
              user_id: user.id,
              amount: -amount, // 消費なのでマイナス
              transaction_type: transactionType,
              reference_id: referenceId,
              description: description || getDefaultTransactionDescription(transactionType, amount)
            });
        } catch (txError) {
          console.warn('トランザクション記録の追加に失敗しましたが、ポイント消費は成功しました:', txError);
        }
        
        // 成功したら状態を更新
        setBalance(prev => prev !== null ? prev - amount : null);
        
        return true;
      } catch (err) {
        console.error('Error updating points:', err);
        setError('ポイント消費に失敗しました');
        return false;
      }
    } catch (err) {
      console.error('Error in consumePoints:', err);
      setError('ポイント消費中にエラーが発生しました');
      return false;
    }
  }, [user, balance, isPremium]);

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
      try {
        // user_pointsテーブルの更新
        const { error: updateError } = await supabase
          .from('user_points')
          .update({
            balance: (balance || 0) + amount,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        if (updateError) {
          // 更新に失敗した場合、レコードが存在しない可能性があるため作成を試みる
          const { error: insertError } = await supabase
            .from('user_points')
            .insert({
              user_id: user.id,
              balance: 100 + amount, // デフォルト100にポイント追加
              lifetime_earned: amount,
              last_updated: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('Error creating user points record:', insertError);
            setError('ポイント追加に失敗しました');
            return false;
          }
        }
        
        // トランザクション記録の追加を試みる
        try {
          await supabase
            .from('point_transactions')
            .insert({
              user_id: user.id,
              amount: amount, // 追加なのでプラス
              transaction_type: transactionType,
              reference_id: referenceId,
              description: description || getDefaultTransactionDescription(transactionType, amount, true)
            });
        } catch (txError) {
          console.warn('トランザクション記録の追加に失敗しましたが、ポイント追加は成功しました:', txError);
        }
        
        // 成功したら状態を更新
        setBalance(prev => prev !== null ? prev + amount : amount);
        
        return true;
      } catch (err) {
        console.error('Error updating points:', err);
        setError('ポイント追加に失敗しました');
        return false;
      }
    } catch (err) {
      console.error('Error in addPoints:', err);
      setError('ポイント追加中にエラーが発生しました');
      return false;
    }
  }, [user, balance]);

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
      
      // ログインテーブルが存在しない可能性があるため、エラー処理を追加
      try {
        // 連続ログイン記録を確認
        const { data, error } = await supabase
          .from('user_logins')
          .select('login_date, streak_count')
          .eq('user_id', user.id)
          .order('login_date', { ascending: false })
          .limit(1);

        if (!error && data) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // 今日すでにログイン済みの場合はスキップ
          if (data.length > 0) {
            const lastLogin = new Date(data[0].login_date);
            lastLogin.setHours(0, 0, 0, 0);
            
            if (lastLogin.getTime() === today.getTime()) {
              return 0; // 今日はすでにボーナス獲得済み
            }
          }

          // 基本ログインボーナス
          let bonusPoints = 1;
          let streakCount = 1;
          let isStreak = false;
          
          // 連続ログインの確認
          if (data.length > 0) {
            const lastLogin = new Date(data[0].login_date);
            lastLogin.setHours(0, 0, 0, 0);
            
            // 昨日ログインしていた場合は連続ログイン
            if (lastLogin.getTime() === yesterday.getTime()) {
              streakCount = (data[0].streak_count || 0) + 1;
              isStreak = true;
              
              // 7日ごとに追加ボーナス
              if (streakCount % 7 === 0) {
                bonusPoints += 5;
              }
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
   * デフォルトのトランザクション説明文を生成
   */
  const getDefaultTransactionDescription = (
    transactionType: TransactionType, 
    amount: number,
    isAddition: boolean = false
  ): string => {
    const absAmount = Math.abs(amount);
    
    switch (transactionType) {
      case 'review':
        return isAddition 
          ? `レビュー投稿で${absAmount}ポイント獲得` 
          : `レビュー取り消しで${absAmount}ポイント減少`;
      case 'purchase':
        return `${absAmount}ポイント購入`;
      case 'message':
        return !isAddition 
          ? `メッセージ送信で${absAmount}ポイント消費` 
          : `メッセージ関連で${absAmount}ポイント獲得`;
      case 'profile_view':
        return `プロフィール閲覧で${absAmount}ポイント消費`;
      case 'refund':
        return `返金で${absAmount}ポイント獲得`;
      case 'login_bonus':
        return `ログインボーナスで${absAmount}ポイント獲得`;
      case 'streak_bonus':
        return `継続ログインボーナスで${absAmount}ポイント獲得`;
      case 'like':
        return `いいねで${absAmount}ポイント消費`;
      case 'match_bonus':
        return `マッチングボーナスで${absAmount}ポイント獲得`;
      case 'message_activity':
        return `メッセージ活動で${absAmount}ポイント獲得`;
      case 'filter_usage':
        return `検索フィルター使用で${absAmount}ポイント消費`;
      default:
        return isAddition
          ? `${absAmount}ポイント獲得`
          : `${absAmount}ポイント消費`;
    }
  };

  /**
   * ポイント履歴の詳細説明を取得
   */
  const getTransactionDescription = useCallback((transaction: PointTransaction): string => {
    if (transaction.description) {
      return transaction.description;
    }
    
    return getDefaultTransactionDescription(
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
    loading,
    error,
    transactions,
    transactionsLoading,
    isPremium,
    fetchBalance,
    refreshBalance, // 新しく追加したメソッド
    fetchTransactions,
    consumePoints,
    addPoints,
    processLoginBonus,
    hasEnoughPoints,
    getTransactionDescription,
    POINT_COSTS
  };
};

export default usePoints;