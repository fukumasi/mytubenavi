// src/services/paymentService.ts

import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

// Stripeサービスをインポート
import { refundPayment, createPaymentIntent } from './stripeService';

// 返金処理の引数型定義
export interface RefundParams {
  paymentId: string;
  paymentType: 'premium' | 'promotion';
  stripePaymentIntentId: string;
  amount: number;
  reason: string;
  isFullRefund: boolean;
}

// 返金処理結果の型定義
export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

// 支払いデータの取得結果型定義
export interface PaymentSummary {
  totalAmount: number;
  premiumAmount: number;
  promotionAmount: number;
  count: number;
  // 以下のプロパティを追加
  refundedAmount?: number;
  premiumRefundAmount?: number;
  promotionRefundAmount?: number;
  refundCount?: number;
}

// スロット情報の型定義
interface PromotionSlotInfo {
  name?: string;
  type?: string;
}

/**
 * 返金処理を実行する
 */
export const processRefund = async (params: RefundParams): Promise<RefundResult> => {
  try {
    // Stripeで返金処理を実行
    const stripeRefund = await refundPayment({
      paymentIntentId: params.stripePaymentIntentId,
      amount: params.amount,
      reason: params.reason
    });

    if (!stripeRefund.success || !stripeRefund.refundId) {
      throw new Error(stripeRefund.error || '返金処理に失敗しました');
    }

    // Supabaseの支払いデータを更新
    if (params.paymentType === 'premium') {
      // プレミアム会員の支払いを更新
      const { error } = await supabase
        .from('premium_payments')
        .update({
          status: params.isFullRefund ? 'refunded' : 'partially_refunded',
          refund_amount: params.amount,
          refund_reason: params.reason,
          refund_date: new Date().toISOString(),
          refund_id: stripeRefund.refundId
        })
        .eq('id', params.paymentId);

      if (error) throw error;
    } else {
      // 広告枠の予約支払いを更新
      const { error } = await supabase
        .from('slot_bookings')
        .update({
          status: params.isFullRefund ? 'refunded' : 'partially_refunded',
          refund_amount: params.amount,
          refund_reason: params.reason,
          refund_date: new Date().toISOString(),
          refund_id: stripeRefund.refundId
        })
        .eq('id', params.paymentId);

      if (error) throw error;
    }

    // 返金通知を作成
    await createRefundNotification(params);

    // 管理ログに記録
    await recordAdminAction({
      action: 'refund',
      resourceType: params.paymentType,
      resourceId: params.paymentId,
      details: {
        amount: params.amount,
        reason: params.reason,
        isFullRefund: params.isFullRefund,
        stripeRefundId: stripeRefund.refundId
      }
    });

    return {
      success: true,
      refundId: stripeRefund.refundId
    };
  } catch (error) {
    console.error('返金処理エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '返金処理中にエラーが発生しました'
    };
  }
};

/**
 * 返金通知を作成する
 */
const createRefundNotification = async (params: RefundParams): Promise<void> => {
  try {
    // 対象ユーザーのIDを取得
    let userId: string | null = null;
    let paymentDetails: any = null;

    if (params.paymentType === 'premium') {
      // プレミアム支払いからユーザーIDを取得
      const { data } = await supabase
        .from('premium_payments')
        .select('user_id, plan, created_at')
        .eq('id', params.paymentId)
        .single();
      
      userId = data?.user_id;
      paymentDetails = data;
    } else {
      // 広告枠予約からユーザーIDを取得
      const { data } = await supabase
        .from('slot_bookings')
        .select('user_id, slot_id, created_at')
        .eq('id', params.paymentId)
        .single();
      
      userId = data?.user_id;
      paymentDetails = data;

      // スロット情報も取得
      if (data?.slot_id) {
        const { data: slotData } = await supabase
          .from('promotion_slots')
          .select('name, type')
          .eq('id', data.slot_id)
          .single();
        
        if (slotData) {
          paymentDetails.slotName = slotData.name;
          paymentDetails.slotType = slotData.type;
        }
      }
    }

    if (!userId) return;

    // 通知メッセージの作成
    const paymentTypeText = params.paymentType === 'premium' 
      ? `プレミアムプラン (${paymentDetails?.plan || '不明'})`
      : `広告枠 (${paymentDetails?.slotName || '不明'})`;
    
    const paymentDate = paymentDetails?.created_at 
      ? new Date(paymentDetails.created_at).toLocaleDateString('ja-JP')
      : '不明な日付';

    // 通知を作成
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'refund',
        title: '返金処理が完了しました',
        message: `${paymentDate}に購入された${paymentTypeText}の代金 ¥${params.amount.toLocaleString()}が返金されました。${params.isFullRefund ? '(全額返金)' : '(一部返金)'}`,
        is_read: false,
        priority: 'high',
        metadata: {
          refundAmount: params.amount,
          originalAmount: params.isFullRefund ? params.amount : null,
          paymentType: params.paymentType,
          paymentTypeText: paymentTypeText,
          paymentDate: paymentDate,
          reason: params.reason,
          refundDate: new Date().toISOString()
        },
        link: '/profile/payments'
      });

    if (error) throw error;
  } catch (error) {
    console.error('返金通知作成エラー:', error);
    // 通知作成のエラーは返金処理自体を失敗させない
  }
};

/**
 * 管理者の操作ログを記録する
 */
const recordAdminAction = async (actionData: {
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
}): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_action_logs')
      .insert({
        action: actionData.action,
        resource_type: actionData.resourceType,
        resource_id: actionData.resourceId,
        details: actionData.details,
        created_at: new Date().toISOString(),
        // 実際の実装では現在のログインユーザー（管理者）のIDを取得して設定する
        admin_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      console.error('管理者ログ記録エラー:', error);
    }
  } catch (error) {
    console.error('管理者ログ記録エラー:', error);
    // ログ記録のエラーは返金処理自体を失敗させない
  }
};

/**
 * すべての支払い履歴を取得する
 */
export const getAllPayments = async (
  page = 1,
  limit = 10,
  filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
    minAmount?: number;
    maxAmount?: number;
    searchTerm?: string;
  } = {}
) => {
  try {
    // 日付フィルターの処理
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    if (endDate) {
      // 終了日の最終時刻に設定
      endDate.setHours(23, 59, 59, 999);
    }

    // ユーザープロフィールの取得
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url');
    
    if (profilesError) throw profilesError;
    
    // プロフィールを辞書化
    const profileMap = profiles?.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>) || {};

    // プロモーションスロットの取得
    const { data: slots, error: slotsError } = await supabase
      .from('promotion_slots')
      .select('id, name, type');
    
    if (slotsError) throw slotsError;
    
    // スロットを辞書化
    const slotMap = slots?.reduce((acc, slot) => {
      acc[slot.id] = slot;
      return acc;
    }, {} as Record<string, any>) || {};

    // Premium payments の取得
    let premiumQuery = supabase
      .from('premium_payments')
      .select(`
        id,
        user_id,
        plan,
        amount,
        status,
        created_at,
        expires_at,
        payment_method,
        subscription_id,
        refund_amount,
        refund_reason,
        refund_date,
        refund_id,
        payment_intent_id
      `);

    // プレミアム支払いへのフィルター適用
    if (startDate) {
      premiumQuery = premiumQuery.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      premiumQuery = premiumQuery.lte('created_at', endDate.toISOString());
    }
    if (filters.status && filters.status !== 'all') {
      premiumQuery = premiumQuery.eq('status', filters.status);
    }
    if (filters.minAmount) {
      premiumQuery = premiumQuery.gte('amount', filters.minAmount);
    }
    if (filters.maxAmount) {
      premiumQuery = premiumQuery.lte('amount', filters.maxAmount);
    }
    if (filters.searchTerm) {
      // 検索はあとでメモリ上でフィルターする
    }

    // スロット予約の取得
    let slotQuery = supabase
      .from('slot_bookings')
      .select(`
        id,
        user_id,
        slot_id,
        start_date,
        end_date,
        amount,
        status,
        created_at,
        payment_intent_id,
        payment_status,
        refund_amount,
        refund_reason,
        refund_date,
        refund_id
      `);

    // スロット予約へのフィルター適用
    if (startDate) {
      slotQuery = slotQuery.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      slotQuery = slotQuery.lte('created_at', endDate.toISOString());
    }
    if (filters.status && filters.status !== 'all') {
      slotQuery = slotQuery.eq('status', filters.status);
    }
    if (filters.minAmount) {
      slotQuery = slotQuery.gte('amount', filters.minAmount);
    }
    if (filters.maxAmount) {
      slotQuery = slotQuery.lte('amount', filters.maxAmount);
    }
    if (filters.searchTerm) {
      // 検索はあとでメモリ上でフィルターする
    }

    // クエリの実行
    const [premiumResult, slotResult] = await Promise.all([
      premiumQuery,
      slotQuery
    ]);

    if (premiumResult.error) throw premiumResult.error;
    if (slotResult.error) throw slotResult.error;

    // データの整形
    const premiumPayments = (premiumResult.data || []).map(item => {
      const userProfile = profileMap[item.user_id] || {};
      return {
        id: item.id,
        userId: item.user_id,
        username: userProfile.username || 'Unknown',
        avatarUrl: userProfile.avatar_url,
        type: 'premium',
        description: `プレミアムプラン: ${item.plan}`,
        amount: item.amount,
        status: item.status,
        createdAt: item.created_at,
        expiresAt: item.expires_at,
        paymentMethod: item.payment_method,
        stripeId: item.payment_intent_id || item.subscription_id,
        refundAmount: item.refund_amount,
        refundReason: item.refund_reason,
        refundDate: item.refund_date,
        refundId: item.refund_id,
        canRefund: ['succeeded', 'active'].includes(item.status) && !item.refund_id
      };
    });

    const slotPayments = (slotResult.data || []).map(item => {
      const userProfile = profileMap[item.user_id] || {};
      const slotInfo = slotMap[item.slot_id] || {};
      return {
        id: item.id,
        userId: item.user_id,
        username: userProfile.username || 'Unknown',
        avatarUrl: userProfile.avatar_url,
        type: 'promotion',
        description: `広告枠: ${slotInfo.name || 'Unknown'} (${slotInfo.type || 'Unknown'})`,
        amount: item.amount,
        status: item.status,
        createdAt: item.created_at,
        startDate: item.start_date,
        endDate: item.end_date,
        stripeId: item.payment_intent_id,
        paymentStatus: item.payment_status,
        refundAmount: item.refund_amount,
        refundReason: item.refund_reason,
        refundDate: item.refund_date,
        refundId: item.refund_id,
        canRefund: ['active', 'completed'].includes(item.status) && !item.refund_id
      };
    });

    // 全データをマージしてソート
    let allPayments = [...premiumPayments, ...slotPayments];
    
    // 検索語でフィルタリング（メモリ上で実行）
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      allPayments = allPayments.filter(payment => 
        payment.username.toLowerCase().includes(searchTerm) ||
        payment.description.toLowerCase().includes(searchTerm) ||
        (payment.refundReason && payment.refundReason.toLowerCase().includes(searchTerm))
      );
    }
    
    // タイプでフィルタリング
    if (filters.type && filters.type !== 'all') {
      allPayments = allPayments.filter(payment => payment.type === filters.type);
    }
    
    // 作成日の降順でソート
    allPayments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // ページネーション用のデータ準備
    const totalCount = allPayments.length;
    const offset = (page - 1) * limit;
    const paginatedPayments = allPayments.slice(offset, offset + limit);

    return {
      data: paginatedPayments,
      total: totalCount,
      page,
      limit,
      // 追加の集計データ
      summary: {
        totalAmount: allPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        refundedAmount: allPayments.reduce((sum, p) => sum + (p.refundAmount || 0), 0),
        activeCount: allPayments.filter(p => ['active', 'succeeded', 'completed'].includes(p.status)).length,
        refundedCount: allPayments.filter(p => ['refunded', 'partially_refunded'].includes(p.status)).length
      }
    };
  } catch (error) {
    console.error('支払い履歴取得エラー:', error);
    toast.error('支払い履歴の取得中にエラーが発生しました');
    return {
      data: [],
      total: 0,
      page,
      limit,
      summary: {
        totalAmount: 0,
        refundedAmount: 0,
        activeCount: 0,
        refundedCount: 0
      }
    };
  }
};

/**
 * 支払い要約データを取得する
 */
export const getPaymentSummary = async (
  filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
  } = {}
): Promise<PaymentSummary> => {
  try {
    // 日付フィルターの処理
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    if (endDate) {
      // 終了日の最終時刻に設定
      endDate.setHours(23, 59, 59, 999);
    }

    // Premium payments クエリ
    let premiumQuery = supabase
      .from('premium_payments')
      .select('amount, status, refund_amount');

    // フィルター適用
    if (startDate) {
      premiumQuery = premiumQuery.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      premiumQuery = premiumQuery.lte('created_at', endDate.toISOString());
    }
    if (filters.status && filters.status !== 'all') {
      premiumQuery = premiumQuery.eq('status', filters.status);
    } else {
      // デフォルトでは成功した支払いのみを計算
      premiumQuery = premiumQuery.in('status', ['succeeded', 'active']);
    }

    // Slot bookings クエリ
    let slotQuery = supabase
      .from('slot_bookings')
      .select('amount, status, refund_amount');

    // フィルター適用
    if (startDate) {
      slotQuery = slotQuery.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      slotQuery = slotQuery.lte('created_at', endDate.toISOString());
    }
    if (filters.status && filters.status !== 'all') {
      slotQuery = slotQuery.eq('status', filters.status);
    } else {
      // デフォルトでは成功した支払いのみを計算
      slotQuery = slotQuery.in('status', ['active', 'completed']);
    }

    // クエリの実行
    const [premiumResult, slotResult] = await Promise.all([
      premiumQuery,
      slotQuery
    ]);

    if (premiumResult.error) throw premiumResult.error;
    if (slotResult.error) throw slotResult.error;

    // 合計金額の計算
    const premiumAmount = (premiumResult.data || []).reduce(
      (sum, item) => sum + (item.amount || 0) - (item.refund_amount || 0),
      0
    );

    const promotionAmount = (slotResult.data || []).reduce(
      (sum, item) => sum + (item.amount || 0) - (item.refund_amount || 0),
      0
    );

    const totalPayments = (premiumResult.data?.length || 0) + (slotResult.data?.length || 0);
    
    // 返金額の計算
    const premiumRefundAmount = (premiumResult.data || []).reduce(
      (sum, item) => sum + (item.refund_amount || 0),
      0
    );

    const promotionRefundAmount = (slotResult.data || []).reduce(
      (sum, item) => sum + (item.refund_amount || 0),
      0
    );

    return {
      totalAmount: premiumAmount + promotionAmount,
      premiumAmount,
      promotionAmount,
      count: totalPayments,
      refundedAmount: premiumRefundAmount + promotionRefundAmount,
      premiumRefundAmount,
      promotionRefundAmount,
      refundCount: (premiumResult.data || []).filter(item => item.refund_amount).length +
                  (slotResult.data || []).filter(item => item.refund_amount).length
    };
  } catch (error) {
    console.error('支払い要約取得エラー:', error);
    return {
      totalAmount: 0,
      premiumAmount: 0,
      promotionAmount: 0,
      count: 0,
      refundedAmount: 0,
      premiumRefundAmount: 0,
      promotionRefundAmount: 0,
      refundCount: 0
    };
  }
};

/**
 * 特定の支払いの詳細を取得する
 */
export const getPaymentDetail = async (paymentId: string, paymentType: 'premium' | 'promotion') => {
  try {
    let paymentData;
    let userData;

    if (paymentType === 'premium') {
      // プレミアム支払いの詳細を取得
      const { data, error } = await supabase
        .from('premium_payments')
        .select(`
          *,
          profiles (id, username, avatar_url, email)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      paymentData = data;
      userData = data?.profiles;
    } else {
      // 広告枠予約の詳細を取得
      const { data, error } = await supabase
        .from('slot_bookings')
        .select(`
          *,
          profiles (id, username, avatar_url, email),
          promotion_slots (id, name, type, price)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      paymentData = data;
      userData = data?.profiles;
    }

    if (!paymentData) {
      throw new Error('支払いデータが見つかりません');
    }

    // 返却データの整形
    return {
      id: paymentData.id,
      type: paymentType,
      amount: paymentData.amount,
      status: paymentData.status,
      createdAt: paymentData.created_at,
      user: userData ? {
        id: userData.id,
        username: userData.username,
        avatarUrl: userData.avatar_url,
        email: userData.email
      } : null,
      paymentDetails: paymentType === 'premium' ? {
        plan: paymentData.plan,
        expiresAt: paymentData.expires_at,
        paymentMethod: paymentData.payment_method,
        subscriptionId: paymentData.subscription_id,
        paymentIntentId: paymentData.payment_intent_id
      } : {
        slotId: paymentData.slot_id,
        slotName: paymentData.promotion_slots?.name,
        slotType: paymentData.promotion_slots?.type,
        startDate: paymentData.start_date,
        endDate: paymentData.end_date,
        paymentIntentId: paymentData.payment_intent_id,
        paymentStatus: paymentData.payment_status
      },
      refund: paymentData.refund_amount ? {
        amount: paymentData.refund_amount,
        reason: paymentData.refund_reason,
        date: paymentData.refund_date,
        id: paymentData.refund_id
      } : null,
      // 返金可能かどうかを判定
      canRefund: (
        !paymentData.refund_id && 
        (paymentType === 'premium' ? 
          ['succeeded', 'active'].includes(paymentData.status) : 
          ['active', 'completed'].includes(paymentData.status))
      )
    };
  } catch (error) {
    console.error('支払い詳細取得エラー:', error);
    throw error;
  }
};

/**
 * 課金プランを取得する
 */
export const getPaymentPlans = async () => {
  try {
    // プレミアムプランの取得
    const { data: premiumPlans, error: premiumError } = await supabase
      .from('premium_plans')
      .select('*')
      .order('price', { ascending: true });

    if (premiumError) throw premiumError;

    // 広告スロットタイプの取得
    const { data: promotionSlots, error: slotsError } = await supabase
      .from('promotion_slots')
      .select('*')
      .order('price', { ascending: true });

    if (slotsError) throw slotsError;

    return {
      premiumPlans: premiumPlans || [],
      promotionSlots: promotionSlots || []
    };
  } catch (error) {
    console.error('課金プラン取得エラー:', error);
    toast.error('課金プランの取得中にエラーが発生しました');
    return {
      premiumPlans: [],
      promotionSlots: []
    };
  }
};

/**
 * 課金プランを更新する
 */
export const updatePaymentPlan = async (
  planType: 'premium' | 'promotion',
  planId: string,
  updates: Record<string, any>
) => {
  try {
    let result;

    if (planType === 'premium') {
      // プレミアムプランの更新
      result = await supabase
        .from('premium_plans')
        .update(updates)
        .eq('id', planId);
    } else {
      // 広告スロットの更新
      result = await supabase
        .from('promotion_slots')
        .update(updates)
        .eq('id', planId);
    }

    if (result.error) throw result.error;

    // 管理ログに記録
    await recordAdminAction({
      action: 'update_plan',
      resourceType: planType,
      resourceId: planId,
      details: updates
    });

    toast.success('課金プランが更新されました');
    return { success: true };
  } catch (error) {
    console.error('課金プラン更新エラー:', error);
    toast.error('課金プランの更新中にエラーが発生しました');
    return { 
      success: false,
      error: error instanceof Error ? error.message : '更新中にエラーが発生しました'
    };
  }
};

/**
 * 支払いレポートをエクスポートする
 */
export const exportPaymentsReport = async (
  filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
  } = {}
) => {
  try {
    // ページネーションなしですべての支払い履歴を取得
    const result = await getAllPayments(1, 10000, filters);
    
    if (!result.data.length) {
      toast.warning('エクスポートするデータがありません');
      return null;
    }
    
    // CSVのヘッダー行
    const headers = [
      'ID',
      'ユーザー名',
      'タイプ',
      '説明',
      '金額',
      'ステータス',
      '作成日',
      '返金金額',
      '返金理由',
      '返金日'
    ];
    
    // データを整形
    const rows = result.data.map(payment => [
      payment.id,
      payment.username,
      payment.type === 'premium' ? 'プレミアム会員' : '広告掲載',
      payment.description,
      payment.amount,
      getStatusText(payment.status),
      new Date(payment.createdAt).toLocaleString('ja-JP'),
      payment.refundAmount || '',
      payment.refundReason || '',
      payment.refundDate ? new Date(payment.refundDate).toLocaleString('ja-JP') : ''
    ]);
    
    // CSVに変換
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // ファイル名の生成
    const today = new Date().toISOString().split('T')[0];
    const filename = `payments_report_${today}.csv`;
    
    // CSVのダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('レポートのエクスポートが完了しました');
    return { success: true, filename };
  } catch (error) {
    console.error('レポートエクスポートエラー:', error);
    toast.error('レポートのエクスポート中にエラーが発生しました');
    return { success: false, error };
  }
};

/**
 * ステータスコードをテキストに変換
 */
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    // プレミアム関連
    'active': '有効',
    'succeeded': '決済完了',
    'canceled': 'キャンセル',
    'refunded': '返金済み',
    'partially_refunded': '一部返金',
    'failed': '失敗',
    'pending': '処理中',
    'trialing': '試用期間中',
    'past_due': '支払い期限超過',
    'incomplete': '未完了',
    'incomplete_expired': '期限切れ',
    'unpaid': '未払い',
    
    // 広告枠関連
    'completed': '完了',
    'expired': '期限切れ',
    'rejected': '却下'
  };
  
  return statusMap[status] || status;
};

/**
 * 支払いステータスを更新する
 */
export const updatePaymentStatus = async (
  paymentId: string,
  paymentType: 'premium' | 'promotion',
  newStatus: string,
  notes?: string
) => {
  try {
    if (paymentType === 'premium') {
      const { error } = await supabase
        .from('premium_payments')
        .update({ 
          status: newStatus,
          admin_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('slot_bookings')
        .update({ 
          status: newStatus,
          admin_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
      
      if (error) throw error;
    }
    
    // 管理ログに記録
    await recordAdminAction({
      action: 'update_status',
      resourceType: paymentType,
      resourceId: paymentId,
      details: {
        newStatus,
        notes
      }
    });
    
    // ユーザーへの通知作成
    await createStatusChangeNotification(paymentId, paymentType, newStatus);
    
    toast.success('ステータスが更新されました');
    return { success: true };
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    toast.error('ステータスの更新中にエラーが発生しました');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '更新中にエラーが発生しました'
    };
  }
};

/**
 * プロモーションスロットの情報を安全に取得する
 */
const safeGetPromotionSlotInfo = (promotionSlots: any): PromotionSlotInfo => {
  if (!promotionSlots) {
    return { name: 'Unknown', type: 'Unknown' };
  }
  
  // オブジェクトの場合
  if (typeof promotionSlots === 'object' && !Array.isArray(promotionSlots)) {
    return { 
      name: promotionSlots.name || 'Unknown', 
      type: promotionSlots.type || 'Unknown' 
    };
  }
  
  // 配列の場合
  if (Array.isArray(promotionSlots) && promotionSlots.length > 0) {
    const firstSlot = promotionSlots[0];
    return { 
      name: firstSlot?.name || 'Unknown', 
      type: firstSlot?.type || 'Unknown' 
    };
  }
  
  return { name: 'Unknown', type: 'Unknown' };
};

/**
 * ステータス変更通知を作成する
 */
const createStatusChangeNotification = async (
  paymentId: string,
  paymentType: 'premium' | 'promotion',
  newStatus: string
) => {
  try {
    // 対象ユーザーと支払い情報を取得
    let userId: string | null = null;
    let paymentInfo: any = null;
    
    if (paymentType === 'premium') {
      const { data } = await supabase
        .from('premium_payments')
        .select('user_id, plan, amount')
        .eq('id', paymentId)
        .single();
      
      userId = data?.user_id;
      paymentInfo = data;
    } else {
      const { data } = await supabase
        .from('slot_bookings')
        .select(`
          user_id, 
          amount,
          slot_id,
          promotion_slots (name)
        `)
        .eq('id', paymentId)
        .single();

      userId = data?.user_id;
      paymentInfo = data;
    }
    
    if (!userId || !paymentInfo) return;
    
    // 支払い説明文の作成
    let paymentDesc = 'Unknown';
    if (paymentType === 'premium') {
      paymentDesc = `プレミアムプラン (${paymentInfo?.plan || 'Unknown'})`;
    } else {
      const slotInfo = paymentInfo.slotName ? 
        { name: paymentInfo.slotName } : 
        safeGetPromotionSlotInfo(paymentInfo.promotion_slots);
        
      paymentDesc = `広告枠 (${slotInfo.name})`;
    }
    
    // ステータスに応じたメッセージを作成
    let title = '';
    let message = '';
    
    if (newStatus === 'active' || newStatus === 'succeeded' || newStatus === 'completed') {
      title = `お支払いが確認されました`;
      message = `${paymentDesc}のお支払い(¥${paymentInfo.amount.toLocaleString()})が確認されました。`;
    } else if (newStatus === 'refunded') {
      title = `返金処理が完了しました`;
      message = `${paymentDesc}のお支払い(¥${paymentInfo.amount.toLocaleString()})の返金処理が完了しました。`;
    } else if (newStatus === 'canceled' || newStatus === 'rejected') {
      title = `お支払いがキャンセルされました`;
      message = `${paymentDesc}のお支払い(¥${paymentInfo.amount.toLocaleString()})がキャンセルされました。`;
    } else if (newStatus === 'failed') {
      title = `お支払いに問題が発生しました`;
      message = `${paymentDesc}のお支払い(¥${paymentInfo.amount.toLocaleString()})に問題が発生しました。詳細はサポートにお問い合わせください。`;
    } else {
      title = `お支払いステータスが更新されました`;
      message = `${paymentDesc}のお支払い(¥${paymentInfo.amount.toLocaleString()})のステータスが「${getStatusText(newStatus)}」に更新されました。`;
    }
    
    // 通知を作成
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'payment_status',
        title,
        message,
        is_read: false,
        priority: newStatus === 'failed' ? 'high' : 'medium',
        metadata: {
          paymentId,
          paymentType,
          newStatus,
          amount: paymentInfo.amount,
          paymentDescription: paymentDesc
        },
        link: '/profile/payments'
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('ステータス変更通知作成エラー:', error);
    // 通知作成のエラーは処理全体を失敗させない
  }
};

/**
 * 新しい支払いを作成する（管理者による手動作成用）
 */
export const createManualPayment = async (paymentData: {
  userId: string;
  type: 'premium' | 'promotion';
  amount: number;
  description: string;
  planId?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}) => {
  try {
    const now = new Date().toISOString();
    
    // Stripe決済意図の作成（オフライン支払いとしてマーク）
    const stripeResult = await createPaymentIntent({
      amount: paymentData.amount,
      currency: 'jpy',
      bookingId: paymentData.planId || 'manual-' + Date.now(), // 必須のbookingIdを追加
      metadata: {
        userId: paymentData.userId,
        paymentType: paymentData.type,
        isManualEntry: 'true',
        notes: paymentData.notes || ''
      },
      description: `[手動作成] ${paymentData.description}`
    });
     
    if (!stripeResult || !stripeResult.paymentIntentId) {
      throw new Error('決済IDの作成に失敗しました');
    }
    
    // Supabaseにデータを保存
    if (paymentData.type === 'premium') {
      // プレミアム支払いの作成
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1); // デフォルトは1ヶ月
      
      const { data, error } = await supabase
        .from('premium_payments')
        .insert({
          user_id: paymentData.userId,
          plan: paymentData.description,
          amount: paymentData.amount,
          payment_method: 'manual',
          status: 'succeeded',
          created_at: now,
          expires_at: paymentData.endDate || expiryDate.toISOString(),
          payment_intent_id: stripeResult.paymentIntentId,
          admin_notes: paymentData.notes || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // ユーザープロフィールの更新
      await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_plan: paymentData.description,
          premium_expiry: paymentData.endDate || expiryDate.toISOString()
        })
        .eq('id', paymentData.userId);
      
      return { success: true, paymentId: data.id };
    } else if (paymentData.type === 'promotion') { // 明示的に条件を追加
      // 広告枠予約の作成
      const { data, error } = await supabase
        .from('slot_bookings')
        .insert({
          user_id: paymentData.userId,
          slot_id: paymentData.planId,
          amount: paymentData.amount,
          status: 'active',
          created_at: now,
          start_date: paymentData.startDate || now,
          end_date: paymentData.endDate || null,
          payment_intent_id: stripeResult.paymentIntentId,
          payment_status: 'succeeded',
          admin_notes: paymentData.notes || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, paymentId: data.id };
    } else {
      throw new Error('不明な支払いタイプです');
    }
  } catch (error) {
    console.error('手動支払い作成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '支払いの作成中にエラーが発生しました'
    };
  }
};

export default {
  processRefund,
  getAllPayments,
  getPaymentSummary,
  getPaymentDetail,
  getPaymentPlans,
  updatePaymentPlan,
  exportPaymentsReport,
  updatePaymentStatus,
  createManualPayment
}; 