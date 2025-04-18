// src/services/pointService.ts
import { supabase } from '@/lib/supabase';
import { TransactionType } from '@/types/matching';

/**
 * ユーザーポイントを管理するサービス
 */
export const pointService = {
  /**
   * ユーザーのポイント残高を取得する
   * @param userId ユーザーID
   * @returns ポイント残高とこれまでの獲得ポイント合計
   */
  async getUserPoints(userId: string): Promise<{ balance: number; lifetimeEarned: number }> {
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('balance, lifetime_earned')
        .eq('user_id', userId)
        .limit(1);
      
      if (error) {
        console.error('ポイント残高取得エラー:', error);
        return { balance: 0, lifetimeEarned: 0 };
      }
      
      if (!data || data.length === 0) {
        // 初期ポイントレコードが存在しない場合は作成
        const created = await this.createDefaultUserPoint(userId);
        return created 
          ? { balance: 100, lifetimeEarned: 0 }
          : { balance: 0, lifetimeEarned: 0 };
      }
      
      return {
        balance: data[0].balance || 0,
        lifetimeEarned: data[0].lifetime_earned || 0
      };
    } catch (err) {
      console.error('ポイント残高取得エラー:', err);
      return { balance: 0, lifetimeEarned: 0 };
    }
  },
  
  /**
   * デフォルトのポイントレコードを作成
   * @param userId ユーザーID
   * @returns 作成成功したかどうか
   */
  async createDefaultUserPoint(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_points')
        .insert({
          user_id: userId,
          balance: 100, // デフォルト初期ポイント
          lifetime_earned: 0,
          last_updated: new Date().toISOString()
        });
      
      return !error;
    } catch (err) {
      console.error('初期ポイント作成エラー:', err);
      return false;
    }
  },
  
  /**
   * ポイントを追加
   * @param userId ユーザーID
   * @param amount 追加するポイント量
   * @param transactionType 取引種別
   * @param referenceId 関連するIDがあれば指定
   * @param description 詳細説明
   * @returns 成功したかどうか
   */
  async addPoints(
    userId: string,
    amount: number,
    transactionType: TransactionType,
    referenceId?: string,
    description?: string
  ): Promise<boolean> {
    if (amount <= 0) {
      console.warn('追加ポイントは正の値にする必要があります');
      return false;
    }
    
    try {
      // 現在のポイント情報を取得
      const currentPoints = await this.getUserPoints(userId);
      
      // ポイント更新
      const { error: updateError } = await supabase
        .from('user_points')
        .update({
          balance: currentPoints.balance + amount,
          lifetime_earned: currentPoints.lifetimeEarned + amount, // 累積ポイントに加算
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.warn('ポイント更新エラー:', updateError);
        // レコードが存在しない場合は新規作成を試みる
        const { error: insertError } = await supabase
          .from('user_points')
          .insert({
            user_id: userId,
            balance: 100 + amount, // デフォルト100 + 追加ポイント
            lifetime_earned: amount,
            last_updated: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('ポイントレコード作成エラー:', insertError);
          return false;
        }
      }
      
      // トランザクション記録
      const defaultDescription = this.getDefaultDescription(transactionType, amount, true);
      
      const { error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          transaction_type: transactionType,
          reference_id: referenceId,
          description: description || defaultDescription
        });
      
      if (txError) {
        console.warn('トランザクション記録エラー:', txError);
        // トランザクション記録に失敗してもポイント自体は加算されているので成功とみなす
      }
      
      return true;
    } catch (err) {
      console.error('ポイント追加エラー:', err);
      return false;
    }
  },
  
  /**
   * ポイントを消費
   * @param userId ユーザーID
   * @param amount 消費するポイント量
   * @param transactionType 取引種別
   * @param isPremium プレミアム会員かどうか
   * @param referenceId 関連するIDがあれば指定
   * @param description 詳細説明
   * @param bypassPremium プレミアム会員でもポイント消費を行うかどうか
   * @returns 成功したかどうか
   */
  async consumePoints(
    userId: string,
    amount: number,
    transactionType: TransactionType,
    isPremium: boolean = false,
    referenceId?: string,
    description?: string,
    bypassPremium: boolean = false
  ): Promise<boolean> {
    // プレミアム会員で、bypassPremiumがfalseならスキップ
    if (isPremium && !bypassPremium) {
      return true;
    }
    
    try {
      // 現在のポイント情報を取得
      const currentPoints = await this.getUserPoints(userId);
      
      // ポイント不足チェック
      if (currentPoints.balance < amount) {
        return false;
      }
      
      // ポイント更新
      const { error: updateError } = await supabase
        .from('user_points')
        .update({
          balance: currentPoints.balance - amount,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.warn('ポイント更新エラー:', updateError);
        return false;
      }
      
      // トランザクション記録
      const defaultDescription = this.getDefaultDescription(transactionType, amount, false);
      
      const { error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          amount: -amount, // 消費はマイナス値
          transaction_type: transactionType,
          reference_id: referenceId,
          description: description || defaultDescription
        });
      
      if (txError) {
        console.warn('トランザクション記録エラー:', txError);
      }
      
      return true;
    } catch (err) {
      console.error('ポイント消費エラー:', err);
      return false;
    }
  },
  
  /**
 * レビュー投稿に対するポイント報酬を処理
 * @param userId ユーザーID
 * @param reviewContent レビュー内容
 * @param reviewId レビューID
 * @param isPremium プレミアム会員かどうか
 * @returns 獲得したポイント数
 */
async processReviewReward(
  userId: string,
  reviewContent: string,
  reviewId: string,
  isPremium: boolean = false
): Promise<number> {
  try {
    console.log(`ポイント報酬処理開始 - ユーザー: ${userId}, レビューID: ${reviewId}`);
    console.log(`コメント内容: ${reviewContent.substring(0, 20)}... (${reviewContent.length}文字)`);
    
    // 基本ポイント（プレミアム会員は2倍）
    let basePoints = isPremium ? 2 : 1;
    console.log(`基本ポイント: ${basePoints} (プレミアム: ${isPremium})`);
    
    // 詳細なレビュー（100文字以上）には追加ポイント
    const contentLength = reviewContent.trim().length;
    let additionalPoints = 0;
    
    if (contentLength >= 300) {
      additionalPoints = 3; // 300文字以上で3ポイント追加
      console.log('300文字以上のレビュー: +3ポイント');
    } else if (contentLength >= 100) {
      additionalPoints = 1; // 100文字以上で1ポイント追加
      console.log('100文字以上のレビュー: +1ポイント');
    }
    
    // 合計ポイント
    const totalPoints = basePoints + additionalPoints;
    console.log(`合計ポイント: ${totalPoints}`);
    
    // ポイント追加
    const success = await this.addPoints(
      userId,
      totalPoints,
      'review',
      reviewId,
      `レビュー投稿で${totalPoints}ポイント獲得${additionalPoints > 0 ? '（質の高いレビュー）' : ''}`
    );
    
    console.log(`ポイント付与結果: ${success ? '成功' : '失敗'}`);
    return success ? totalPoints : 0;
  } catch (err) {
    console.error('レビュー報酬処理エラー:', err);
    return 0;
  }
},
  
  /**
   * デフォルトのトランザクション説明文を生成
   * @param transactionType 取引種別
   * @param amount ポイント量
   * @param isAddition 追加か消費か
   * @returns 説明文
   */
  getDefaultDescription(
    transactionType: TransactionType,
    amount: number,
    isAddition: boolean = false
  ): string {
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
  }
};

export default pointService;