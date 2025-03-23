// src/hooks/usePoints.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TransactionType } from '../types/matching';

export type PointTransaction = {
 id: string;
 user_id: string;
 amount: number;
 transaction_type: TransactionType;
 reference_id?: string;
 created_at: string;
 description?: string;
};

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

 /**
  * ユーザーのポイント残高を取得
  */
 const fetchBalance = useCallback(async () => {
   if (!user) {
     setBalance(null);
     setLoading(false);
     return;
   }

   setLoading(true);
   setError(null);

   try {
     const { data, error } = await supabase
       .from('user_points')
       .select('balance, lifetime_earned')
       .eq('user_id', user.id)
       .single();

     if (error) {
       console.error('Error fetching point balance:', error);
       setError('ポイント残高の取得に失敗しました');
       // エラーでも続行：残高が0のユーザーが初めてアクセスした場合は正常
     }

     // データがない場合は0を設定（新規ユーザー）
     setBalance(data?.balance || 0);
   } catch (err) {
     console.error('Error in fetchBalance:', err);
     setError('ポイント残高の取得中にエラーが発生しました');
   } finally {
     setLoading(false);
   }
 }, [user]);

 /**
  * ユーザーのポイント取引履歴を取得
  */
 const fetchTransactions = useCallback(async (limit: number = 10) => {
   if (!user) {
     setTransactions([]);
     return;
   }

   setTransactionsLoading(true);
   setError(null);

   try {
     const { data, error } = await supabase
       .from('point_transactions')
       .select('*')
       .eq('user_id', user.id)
       .order('created_at', { ascending: false })
       .limit(limit);

     if (error) {
       console.error('Error fetching transactions:', error);
       setError('取引履歴の取得に失敗しました');
       return;
     }

     setTransactions(data || []);
   } catch (err) {
     console.error('Error in fetchTransactions:', err);
     setError('取引履歴の取得中にエラーが発生しました');
   } finally {
     setTransactionsLoading(false);
   }
 }, [user]);

 /**
  * ポイントを消費
  * @param amount 消費するポイント量
  * @param transactionType 取引種別
  * @param referenceId 関連するIDがあれば指定
  * @param description 詳細説明
  */
 const consumePoints = useCallback(async (
   amount: number,
   transactionType: TransactionType,
   referenceId?: string,
   description?: string
 ): Promise<boolean> => {
   if (!user) {
     setError('ユーザーがログインしていません');
     return false;
   }

   if (balance === null || balance < amount) {
     setError('ポイントが不足しています');
     return false;
   }

   try {
     // トランザクションの開始
     const { data: userPointsData, error: userPointsError } = await supabase
       .from('user_points')
       .select('balance, lifetime_earned')
       .eq('user_id', user.id)
       .single();

     if (userPointsError && userPointsError.code !== 'PGRST116') { // PGRST116はデータが見つからない場合のエラーコード
       console.error('Error checking user points:', userPointsError);
       setError('ポイント残高の確認に失敗しました');
       return false;
     }

     const currentBalance = userPointsData?.balance || 0;
     const lifetimeEarned = userPointsData?.lifetime_earned || 0;

     if (currentBalance < amount) {
       setError('ポイントが不足しています');
       return false;
     }

     // ポイント残高の更新
     const { error: updateError } = await supabase
       .from('user_points')
       .upsert({
         user_id: user.id,
         balance: currentBalance - amount,
         lifetime_earned: lifetimeEarned // 既存の値を維持
       });

     if (updateError) {
       console.error('Error updating point balance:', updateError);
       setError('ポイント残高の更新に失敗しました');
       return false;
     }

     // トランザクション記録の作成
     const { error: transactionError } = await supabase
       .from('point_transactions')
       .insert({
         user_id: user.id,
         amount: -amount, // 消費はマイナス値
         transaction_type: transactionType,
         reference_id: referenceId,
         description: description
       });

     if (transactionError) {
       console.error('Error recording transaction:', transactionError);
       setError('取引記録の作成に失敗しました');
       // トランザクション記録に失敗しても、ポイント消費自体は成功したと見なす
     }

     // 成功したら状態を更新
     setBalance(prev => prev !== null ? prev - amount : null);
     
     // トランザクションリストを更新（最新のものを追加）
     await fetchTransactions();

     return true;
   } catch (err) {
     console.error('Error in consumePoints:', err);
     setError('ポイント消費中にエラーが発生しました');
     return false;
   }
 }, [user, balance, fetchTransactions]);

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
     // 現在のポイント残高取得
     const { data: userPointsData } = await supabase
       .from('user_points')
       .select('balance, lifetime_earned')
       .eq('user_id', user.id)
       .single();

     const currentBalance = userPointsData?.balance || 0;
     const lifetimeEarned = userPointsData?.lifetime_earned || 0;

     // ポイント残高の更新または作成
     const { error: updateError } = await supabase
       .from('user_points')
       .upsert({
         user_id: user.id,
         balance: currentBalance + amount,
         lifetime_earned: lifetimeEarned + amount
       });

     if (updateError) {
       console.error('Error updating point balance:', updateError);
       setError('ポイント残高の更新に失敗しました');
       return false;
     }

     // トランザクション記録の作成
     const { error: transactionError } = await supabase
       .from('point_transactions')
       .insert({
         user_id: user.id,
         amount: amount, // 追加はプラス値
         transaction_type: transactionType,
         reference_id: referenceId,
         description: description
       });

     if (transactionError) {
       console.error('Error recording transaction:', transactionError);
       setError('取引記録の作成に失敗しました');
       // トランザクション記録に失敗しても、ポイント追加自体は成功したと見なす
     }

     // 成功したら状態を更新
     setBalance(prev => prev !== null ? prev + amount : amount);
     
     // トランザクションリストを更新
     await fetchTransactions();

     return true;
   } catch (err) {
     console.error('Error in addPoints:', err);
     setError('ポイント追加中にエラーが発生しました');
     return false;
   }
 }, [user, fetchTransactions]);

 /**
  * 特定のアクションにポイントが足りるかチェック
  * @param actionCost アクションのコスト
  */
 const hasEnoughPoints = useCallback((actionCost: number): boolean => {
   if (balance === null) return false;
   return balance >= actionCost;
 }, [balance]);

 /**
  * ポイント履歴の詳細説明を取得
  */
 const getTransactionDescription = useCallback((transaction: PointTransaction): string => {
   const amount = Math.abs(transaction.amount);
   
   switch (transaction.transaction_type) {
     case 'review':
       return transaction.amount > 0 
         ? `レビュー投稿で${amount}ポイント獲得` 
         : `レビュー取り消しで${amount}ポイント減少`;
     case 'purchase':
       return `${amount}ポイント購入`;
     case 'message':
       return transaction.amount < 0 
         ? `メッセージ送信で${amount}ポイント消費` 
         : `メッセージ関連で${amount}ポイント獲得`;
     case 'profile_view':
       return `プロフィール閲覧で${amount}ポイント消費`;
     case 'refund':
       return `返金で${amount}ポイント獲得`;
     case 'login_bonus':
       return `ログインボーナスで${amount}ポイント獲得`;
     case 'streak_bonus':
       return `継続ログインボーナスで${amount}ポイント獲得`;
     case 'like':
       return `いいねで${amount}ポイント消費`;
     default:
       return transaction.description || `取引: ${amount}ポイント`;
   }
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
   fetchBalance,
   fetchTransactions,
   consumePoints,
   addPoints,
   hasEnoughPoints,
   getTransactionDescription,
   POINT_COSTS
 };
};

export default usePoints;