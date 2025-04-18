// src/services/stripeService.ts

import { supabase } from '../lib/supabase';

// Supabaseエッジ関数のベースURL
// エッジ関数の命名規則に基づいたURLを構築
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

// API リクエストのタイムアウト時間（ミリ秒）
const API_TIMEOUT = 30000; // 30秒

// 型定義
export interface PaymentIntentResponse {
  clientSecret?: string;
  paymentIntentId?: string;
  redirectUrl?: string;
  error?: string;
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

// 決済インテント作成パラメータ
export interface CreatePaymentIntentParams {
  amount: number;
  bookingId: string;
  description?: string;
  metadata?: Record<string, string>;
  currency?: string;
}

// APIエラー型定義
export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

// タイムアウト付きフェッチ関数
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number): Promise<Response> => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error(`リクエストがタイムアウトしました (${timeout}ms)`)), timeout)
    ) as Promise<Response>
  ]);
};

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
  customHeaders?: Record<string, string>,
  timeout: number = API_TIMEOUT
): Promise<T> => {
  const token = await getAuthToken();
  
  const url = `${FUNCTIONS_BASE_URL}/${functionName}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...customHeaders
  };

  try {
    const response = await fetchWithTimeout(
      url, 
      {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
      timeout
    );
    
    const contentType = response.headers.get('content-type');
    
    // レスポンスがJSONでない場合のハンドリング
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`APIリクエストに失敗しました (${response.status}): JSONではないレスポンス`);
      }
      
      // 空のレスポンスをJSONとして扱う（成功ケース）
      return {} as T;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.error || `APIリクエストに失敗しました (${response.status})`;
      const error: ApiError = {
        status: response.status,
        message: errorMessage,
        code: data.code
      };
      
      console.error(`APIエラー (${functionName}):`, error);
      throw new Error(errorMessage);
    }
    
    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`APIリクエストエラー (${functionName}):`, error.message);
      throw error;
    }
    
    // 未知のエラーケース
    console.error(`APIリクエスト未知のエラー (${functionName}):`, error);
    throw new Error('APIリクエスト中に予期しないエラーが発生しました');
  }
};

// 決済インテント作成（更新したインターフェースに対応）
export const createPaymentIntent = async (params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> => {
  try {
    // 必須パラメータのチェック
    if (!params.amount || !params.bookingId) {
      throw new Error('決済インテント作成には金額と予約IDが必要です');
    }

    // 予約情報の取得（存在確認）
    const { data: bookingData, error: bookingError } = await supabase
      .from('slot_bookings')
      .select('*')
      .eq('id', params.bookingId)
      .single();

    if (bookingError || !bookingData) {
      console.error('予約情報の取得エラー:', bookingError);
      throw new Error('指定された予約が見つかりません');
    }

    // 金額の整合性チェック - amount_paidフィールドを使用するように修正
    if (bookingData.amount_paid !== params.amount) {
      throw new Error('予約金額と支払い金額が一致しません');
    }

    // ユーザー情報の取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('ユーザー情報の取得に失敗しました');
    }

    // 予約に関連するスロット情報の取得
    const { data: slotData, error: slotError } = await supabase
      .from('promotion_slots')
      .select('*')
      .eq('id', bookingData.slot_id)
      .single();

    if (slotError || !slotData) {
      console.error('スロット情報の取得エラー:', slotError);
      throw new Error('関連する掲載枠が見つかりません');
    }

    // 動画情報の取得
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', bookingData.video_id)
      .single();

    if (videoError || !videoData) {
      console.error('動画情報の取得エラー:', videoError);
      throw new Error('関連する動画が見つかりません');
    }

    // 開始日と終了日から期間（日数）を計算
    const startDate = new Date(bookingData.start_date);
    const endDate = new Date(bookingData.end_date);
    const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // メタデータの構築
    const metadata = {
      booking_id: params.bookingId,
      user_id: user.id,
      slot_id: bookingData.slot_id,
      video_id: bookingData.video_id,
      video_title: videoData.title || '不明な動画',
      slot_name: slotData.name || '不明な掲載枠',
      slot_type: slotData.type || 'unknown',
      duration: durationDays.toString(),
      ...params.metadata || {}
    };

    // 決済説明の構築
    const description = params.description || 
      `掲載枠予約: ${slotData.name} (${slotData.type}) - ${durationDays}日間`;

    // エッジ関数へのリクエスト
    const response = await apiRequest<PaymentIntentResponse>(
      'create-payment-intent',
      'POST', 
      {
        amount: params.amount,
        currency: params.currency || 'jpy',
        type: 'promotion',
        bookingId: params.bookingId,
        description,
        metadata
      }
    );

    // 支払いインテントIDの保存
    if (response.paymentIntentId) {
      await supabase
        .from('slot_bookings')
        .update({ 
          payment_intent_id: response.paymentIntentId,
          payment_status: 'processing'
        })
        .eq('id', params.bookingId);
    }

    return response;
  } catch (error) {
    console.error('決済インテント作成エラー:', error);
    if (error instanceof Error) {
      return {
        error: `決済インテント作成エラー: ${error.message}`
      };
    }
    return {
      error: '決済インテント作成中に予期しないエラーが発生しました'
    };
  }
};

// 元のcreatePaymentIntent関数をレガシーとして残す（既存コードとの互換性のため）
export const createPaymentIntentLegacy = async (
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
    if (error instanceof Error) {
      return {
        error: `決済インテント作成エラー: ${error.message}`
      };
    }
    return {
      error: '決済インテント作成中に予期しないエラーが発生しました'
    };
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
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    if (updateError) {
      console.warn('顧客IDの保存に失敗しましたが、処理を続行します:', updateError.message);
    }

    return { customerId };
  } catch (error) {
    console.error('Stripe顧客ID取得エラー:', error);
    if (error instanceof Error) {
      throw new Error(`Stripe顧客ID取得エラー: ${error.message}`);
    }
    throw new Error('Stripe顧客ID取得中に予期しないエラーが発生しました');
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
    if (error instanceof Error) {
      throw new Error(`サブスクリプション作成エラー: ${error.message}`);
    }
    throw new Error('サブスクリプション作成中に予期しないエラーが発生しました');
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
    if (error instanceof Error) {
      throw new Error(`サブスクリプションキャンセルエラー: ${error.message}`);
    }
    throw new Error('サブスクリプションキャンセル中に予期しないエラーが発生しました');
  }
};

// 有料動画掲載枠支払い作成
export const createPromotionPayment = async (
  slotId: string,
  amount: number,
  duration: number,
  videoId: string
): Promise<PaymentIntentResponse> => {
  try {
    // ユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('ユーザー情報が取得できません');

    // 動画情報を取得
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !videoData) {
      throw new Error('動画情報の取得に失敗しました');
    }

    // 予約データを作成
    const start = new Date();
    start.setDate(start.getDate() + 1); // 翌日から開始

    const end = new Date(start);
    end.setDate(end.getDate() + duration);

    // 予約データを挿入 - フィールド名をamountからamount_paidに変更
    const { data: bookingData, error: bookingError } = await supabase
      .from('slot_bookings')
      .insert([{
        user_id: user.id,
        youtuber_id: user.id,
        slot_id: slotId,
        video_id: videoId,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        duration: duration,
        amount_paid: amount,  // amountからamount_paidに変更
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select();

    if (bookingError || !bookingData || bookingData.length === 0) {
      throw new Error('予約データの作成に失敗しました: ' + (bookingError?.message || ''));
    }

    // 作成された予約IDを使って決済インテントを作成
    return await createPaymentIntent({
      amount,
      bookingId: bookingData[0].id,
      description: `掲載枠予約: ${duration}日間 - ${videoData.title}`,
      metadata: {
        video_title: videoData.title,
        youtuber_id: user.id
      }
    });
  } catch (error) {
    console.error('プロモーション支払い作成エラー:', error);
    if (error instanceof Error) {
      return {
        error: `プロモーション支払い作成エラー: ${error.message}`
      };
    }
    return {
      error: 'プロモーション支払い作成中に予期しないエラーが発生しました'
    };
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
      await updatePromotionSlotStatus(paymentIntentId, 'active');
    }

    return status;
  } catch (error) {
    console.error('決済状態更新エラー:', error);
    if (error instanceof Error) {
      throw new Error(`決済状態更新エラー: ${error.message}`);
    }
    throw new Error('決済状態更新中に予期しないエラーが発生しました');
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
    if (error instanceof Error) {
      throw new Error(`プレミアム状態更新エラー: ${error.message}`);
    }
    throw new Error('プレミアム状態更新中に予期しないエラーが発生しました');
  }
};

// プロモーションスロットステータスの更新
export const updatePromotionSlotStatus = async (
  paymentIntentId: string, 
  status: 'pending' | 'active' | 'completed' | 'cancelled'
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
      .update({ 
        status, 
        payment_status: status === 'active' || status === 'completed' ? 'succeeded' : 
                      status === 'cancelled' ? 'cancelled' : 'pending'
      })
      .eq('payment_intent_id', paymentIntentId);

    if (updateError) throw updateError;
    
    // active状態または完了状態の場合、動画情報を掲載枠に連携
    if ((status === 'active' || status === 'completed') && bookingData) {
      await updateSlotVideoInfo(bookingData.slot_id, bookingData.video_id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('プロモーションスロット更新エラー:', error);
    if (error instanceof Error) {
      throw new Error(`プロモーションスロット更新エラー: ${error.message}`);
    }
    throw new Error('プロモーションスロット更新中に予期しないエラーが発生しました');
  }
};

// 掲載枠の動画情報を更新
export const updateSlotVideoInfo = async (
  slotId: string, 
  videoId: string
): Promise<{ success: boolean }> => {
  try {
    // 動画情報を取得
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('youtube_id, title, thumbnail')  // thumbnail_urlからthumbnailに修正
      .eq('id', videoId)
      .single();
      
    if (videoError || !videoData) throw videoError || new Error('動画情報が見つかりません');
    
    // 掲載枠を更新
    const { error } = await supabase
      .from('promotion_slots')
      .update({ 
        video_id: videoId,
        youtube_id: videoData.youtube_id
      })
      .eq('id', slotId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('掲載枠の動画情報更新エラー:', error);
    if (error instanceof Error) {
      throw new Error(`掲載枠の動画情報更新エラー: ${error.message}`);
    }
    throw new Error('掲載枠の動画情報更新中に予期しないエラーが発生しました');
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
    if (error instanceof Error) {
      throw new Error(`決済ステータス確認エラー: ${error.message}`);
    }
    throw new Error('決済ステータス確認中に予期しないエラーが発生しました');
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
    if (error instanceof Error) {
      throw new Error(`サブスクリプション情報取得エラー: ${error.message}`);
    }
    throw new Error('サブスクリプション情報取得中に予期しないエラーが発生しました');
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
    // リクエストが重要なため、タイムアウトを長めに設定
    const response = await apiRequest<{ refundId: string }>(
      'create-payment-intent',
      'POST',
      {
        refund: true,
        paymentIntentId,
        amount,
        reason
      },
      undefined,
      60000 // 60秒
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

// すべての主要関数をまとめたオブジェクト
export const stripeService = {
  createPaymentIntent,
  getOrCreateStripeCustomer,
  createSubscription,
  cancelSubscription,
  createPromotionPayment,
  updatePaymentStatus,
  updatePremiumStatus,
  updatePromotionSlotStatus,
  updateSlotVideoInfo,
  checkPaymentStatus,
  getCurrentSubscription,
  refundPayment,
  extractYouTubeId
};

export default stripeService;