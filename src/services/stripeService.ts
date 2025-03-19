// src/services/stripeService.ts

import { supabase } from '../lib/supabase';

// Supabaseエッジ関数のベースURL
// エッジ関数の命名規則に基づいたURLを構築
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

// 型定義
export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface StripeCustomerResponse {
  customerId: string;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret: string;
}

export interface PaymentStatusResponse {
  status: string;
  payment_status: string;
}

export interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  status?: string;
  currentPeriodEnd?: string;
  plan?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  error?: string;
}

// Supabase認証トークンの取得
const getAuthToken = async (): Promise<string> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
};

// APIリクエスト用のヘルパー関数
const apiRequest = async <T>(
  functionName: string, 
  method: string, 
  body?: any,
  customHeaders?: Record<string, string>
): Promise<T> => {
  const token = await getAuthToken();
  
  const url = `${FUNCTIONS_BASE_URL}/${functionName}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...customHeaders
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `APIリクエストに失敗しました (${response.status})`);
    }
    
    return data as T;
  } catch (error) {
    console.error(`APIリクエストエラー (${functionName}):`, error);
    throw error;
  }
};

// 決済インテント作成
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'jpy',
  slotId?: string | null,
  duration?: number,
  options?: {
    description?: string;
    metadata?: Record<string, string>;
  }
): Promise<PaymentIntentResponse> => {
  try {
    return await apiRequest<PaymentIntentResponse>(
      'create-payment-intent',
      'POST', 
      {
        amount,
        currency,
        slotId,
        duration,
        type: 'promotion',
        description: options?.description,
        metadata: options?.metadata
      }
    );
  } catch (error) {
    console.error('決済インテント作成エラー:', error);
    throw error;
  }
};

// Stripe顧客IDの作成または取得
export const getOrCreateStripeCustomer = async (): Promise<StripeCustomerResponse> => {
  try {
    // プロファイル情報を取得
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .single();

    if (profileError) throw profileError;
    
    // すでにStripe顧客IDがある場合はそれを返す
    if (userProfile?.stripe_customer_id) {
      return { customerId: userProfile.stripe_customer_id };
    }

    // ユーザー情報の取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw userError || new Error('ユーザー情報が取得できません');

    // Stripe顧客IDがない場合は作成
    const { customerId } = await apiRequest<StripeCustomerResponse>(
      'create-payment-intent', 
      'POST',
      {
        createCustomer: true,
        email: user.email,
        name: userProfile?.display_name || user.email
      }
    );

    // プロフィールにStripe顧客IDを保存
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    return { customerId };
  } catch (error) {
    console.error('Stripe顧客ID取得エラー:', error);
    throw error;
  }
};

// サブスクリプション作成
export const createSubscription = async (priceId: string): Promise<SubscriptionResponse> => {
  try {
    // 顧客IDを取得または作成
    const { customerId } = await getOrCreateStripeCustomer();
    
    return await apiRequest<SubscriptionResponse>(
      'create-payment-intent', 
      'POST',
      {
        customerId,
        priceId,
        type: 'premium'
      }
    );
  } catch (error) {
    console.error('サブスクリプション作成エラー:', error);
    throw error;
  }
};

// サブスクリプションキャンセル
export const cancelSubscription = async (subscriptionId: string): Promise<{ status: string }> => {
  try {
    return await apiRequest<{ status: string }>(
      'create-payment-intent', 
      'POST',
      {
        subscriptionId,
        cancel: true
      }
    );
  } catch (error) {
    console.error('サブスクリプションキャンセルエラー:', error);
    throw error;
  }
};

// 有料動画掲載枠支払い作成
export const createPromotionPayment = async (
  slotId: string,
  amount: number,
  duration: number,
  videoUrl: string
): Promise<PaymentIntentResponse> => {
  try {
    // ユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('ユーザー情報が取得できません');

    // YouTubeのビデオIDを抽出
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) throw new Error('有効なYouTube URLではありません');

    return await apiRequest<PaymentIntentResponse>(
      'create-payment-intent',
      'POST', 
      {
        amount,
        slotId,
        duration,
        type: 'promotion',
        videoId,
        userId: user.id
      }
    );
  } catch (error) {
    console.error('プロモーション支払い作成エラー:', error);
    throw error;
  }
};

// 決済状態の確認と更新
export const updatePaymentStatus = async (
  paymentIntentId: string, 
  paymentType: 'premium' | 'promotion'
): Promise<PaymentStatusResponse> => {
  try {
    const status = await checkPaymentStatus(paymentIntentId);

    // paymentType に応じた追加処理
    if (paymentType === 'premium' && status.status === 'succeeded') {
      // プレミアム会員のステータス更新
      await updatePremiumStatus(true);
    } else if (paymentType === 'promotion' && status.status === 'succeeded') {
      // プロモーション枠の予約完了処理
      await updatePromotionSlotStatus(paymentIntentId, 'completed');
    }

    return status;
  } catch (error) {
    console.error('決済状態更新エラー:', error);
    throw error;
  }
};

// プレミアム会員ステータスの更新
export const updatePremiumStatus = async (isPremium: boolean): Promise<{ success: boolean }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('ユーザー情報が取得できません');

    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: isPremium })
      .eq('id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('プレミアム状態更新エラー:', error);
    throw error;
  }
};

// プロモーションスロットステータスの更新
export const updatePromotionSlotStatus = async (
  paymentIntentId: string, 
  status: 'pending' | 'completed' | 'cancelled'
): Promise<{ success: boolean }> => {
  try {
    // 関連するスロット予約を取得
    const { data: bookingData, error: fetchError } = await supabase
      .from('slot_bookings')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // 予約ステータスを更新
    const { error: updateError } = await supabase
      .from('slot_bookings')
      .update({ status })
      .eq('payment_intent_id', paymentIntentId);

    if (updateError) throw updateError;
    
    // completed状態の場合、YouTubeIDを掲載枠に設定
    if (status === 'completed' && bookingData?.youtube_id) {
      await updateSlotYoutubeId(bookingData.slot_id, bookingData.youtube_id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('プロモーションスロット更新エラー:', error);
    throw error;
  }
};

// 掲載枠のYouTube IDを更新
export const updateSlotYoutubeId = async (
  slotId: string, 
  youtubeId: string
): Promise<{ success: boolean }> => {
  try {
    const { error } = await supabase
      .from('promotion_slots')
      .update({ youtube_id: youtubeId })
      .eq('id', slotId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('YouTube ID更新エラー:', error);
    throw error;
  }
};

// プラン設定（実際のStripeダッシュボードで設定したIDに合わせる必要があります）
export const STRIPE_PLANS = {
  MONTHLY: 'price_1R0PjKCNKD1NSGcS9daQYNJZ', 
  QUARTERLY: 'price_1R0PjKCNKD1NSGcSmNHSWdyK', 
  YEARLY: 'price_1R0PjKCNKD1NSGcS7IB71vr2', 
};

// YouTube URLからビデオIDを抽出するヘルパー関数
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // 標準的なYouTube URL
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return (match && match[2].length === 11) ? match[2] : null;
}

// 決済ステータスの確認
export const checkPaymentStatus = async (paymentIntentId: string): Promise<PaymentStatusResponse> => {
  try {
    return await apiRequest<PaymentStatusResponse>(
      'create-payment-intent',
      'POST', 
      {
        checkStatus: true,
        paymentIntentId
      }
    );
  } catch (error) {
    console.error('決済ステータス確認エラー:', error);
    throw error;
  }
};

// 現在のサブスクリプション情報の取得
export const getCurrentSubscription = async (): Promise<SubscriptionInfo> => {
  try {
    // プロフィール情報とサブスクリプションIDを取得
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, is_premium')
      .single();

    if (profileError) throw profileError;
    
    // サブスクリプションIDがない、または非プレミアム会員の場合
    if (!userProfile?.stripe_subscription_id || !userProfile?.is_premium) {
      return { hasActiveSubscription: false };
    }

    // サブスクリプション情報を取得
    return await apiRequest<SubscriptionInfo>(
      'create-payment-intent',
      'POST', 
      {
        getSubscription: true,
        subscriptionId: userProfile.stripe_subscription_id
      }
    );
  } catch (error) {
    console.error('サブスクリプション情報取得エラー:', error);
    throw error;
  }
};

/**
 * Stripe 決済の返金処理を行う
 */
export const refundPayment = async ({
  paymentIntentId,
  amount,
  reason
}: {
  paymentIntentId: string;
  amount: number;
  reason: string;
}): Promise<RefundResponse> => {
  try {
    // Supabase Edge Function を呼び出して返金処理を実行
    const response = await apiRequest<{ refundId: string }>(
      'create-payment-intent',
      'POST',
      {
        refund: true,
        paymentIntentId,
        amount,
        reason
      }
    );

    return {
      success: true,
      refundId: response.refundId
    };
  } catch (error) {
    console.error('Stripe返金処理エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '返金処理中にエラーが発生しました'
    };
  }
};