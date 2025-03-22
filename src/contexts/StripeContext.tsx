// src/contexts/StripeContext.tsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { stripeService } from '../services/stripeService';
import StripeProvider from '../components/stripe/StripeProvider';
import { Appearance } from '@stripe/stripe-js';

// 決済初期化のパラメータ型
interface PaymentInitParams {
  amount: number;
  bookingId: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

// 決済初期化の結果型
interface PaymentInitResult {
  success: boolean;
  redirectUrl?: string;
  clientSecret?: string;
  error?: string;
}

// コンテキストの型定義
interface StripeContextType {
  // 決済インテント関連
  clientSecret: string | null;
  setClientSecret: (secret: string | null) => void;
  
  // 決済状態関連
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  paymentError: string | null;
  setPaymentError: (error: string | null) => void;
  paymentSuccess: boolean;
  setPaymentSuccess: (success: boolean) => void;
  
  // 決済完了ハンドラー
  handlePaymentCompleted: () => void;
  
  // 決済タイプ
  paymentType: 'premium' | 'promotion' | null;
  setPaymentType: (type: 'premium' | 'promotion' | null) => void;
  
  // カスタム外観設定
  customAppearance: Appearance | undefined;
  setCustomAppearance: (appearance: Appearance | undefined) => void;
  
  // 決済UIリセット関数
  resetPaymentState: () => void;

  // 決済処理初期化関数
  initiatePayment: (params: PaymentInitParams) => Promise<PaymentInitResult>;
}

// デフォルトの外観設定
const defaultAppearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#3b82f6', // Blue-500のカラーコード
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '4px',
    fontWeightNormal: '400',
    colorBackground: '#ffffff',
    colorText: '#1f2937',
    colorDanger: '#ef4444',
    spacingUnit: '4px'
  },
  rules: {
    '.Input': {
      boxShadow: 'none', // 問題のあるboxShadowを明示的に上書き
      padding: '12px'
    },
    '.Label': {
      fontWeight: '500'
    },
    '.Tab': {
      padding: '10px 16px',
      border: '1px solid #e5e7eb'
    },
    '.Tab:hover': {
      backgroundColor: '#f9fafb'
    },
    '.Tab--selected': {
      backgroundColor: '#eff6ff',
      borderColor: '#3b82f6'
    },
    '.Error': {
      fontSize: '14px',
      marginTop: '8px'
    }
  }
};

// コンテキストの作成
const StripeContext = createContext<StripeContextType | undefined>(undefined);

// コンテキストを使用するためのフック
export const useStripeContext = () => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripeContext must be used within a StripeContextProvider');
  }
  return context;
};

// プロバイダーコンポーネント
export const StripeContextProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // 決済インテント
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // 決済状態
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  
  // 決済タイプ（プレミアム会員またはプロモーション）
  const [paymentType, setPaymentType] = useState<'premium' | 'promotion' | null>(null);
  
  // カスタム外観設定
  const [customAppearance, setCustomAppearance] = useState<Appearance | undefined>(defaultAppearance);

  // 決済完了処理
  const handlePaymentCompleted = useCallback(() => {
    setPaymentSuccess(true);
    setIsProcessing(false);
    setPaymentError(null);
  }, []);

  // 決済状態リセット
  const resetPaymentState = useCallback(() => {
    setClientSecret(null);
    setIsProcessing(false);
    setPaymentError(null);
    setPaymentSuccess(false);
    setPaymentType(null);
  }, []);

  // 決済初期化関数
  const initiatePayment = useCallback(async (params: PaymentInitParams): Promise<PaymentInitResult> => {
    try {
      setIsProcessing(true);
      setPaymentError(null);
      setPaymentSuccess(false);
      setPaymentType('promotion');

      // 認証チェック
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPaymentError('認証されていません。再度ログインしてください。');
        return { 
          success: false, 
          error: '認証されていません。再度ログインしてください。' 
        };
      }

      // 予約に関連する情報を確認
      const { data: bookingData, error: bookingError } = await supabase
        .from('slot_bookings')
        .select('*')
        .eq('id', params.bookingId)
        .eq('user_id', user.id)
        .single();

      if (bookingError || !bookingData) {
        const errorMessage = '予約情報の確認に失敗しました。';
        setPaymentError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // 金額の確認（不一致の場合はエラー）
      if (bookingData.amount !== params.amount) {
        const errorMessage = '予約金額に不一致があります。管理者にお問い合わせください。';
        setPaymentError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Stripe決済インテントの作成
      const paymentResponse = await stripeService.createPaymentIntent({
        amount: params.amount,
        bookingId: params.bookingId,
        description: params.description,
        metadata: {
          bookingId: params.bookingId,
          userId: user.id,
          ...params.metadata
        }
      });

      if (paymentResponse.error) {
        setPaymentError(paymentResponse.error);
        return { success: false, error: paymentResponse.error };
      }

      // クライアントサイドでの処理に必要な情報がある場合
      if (paymentResponse.clientSecret) {
        setClientSecret(paymentResponse.clientSecret);
        return { 
          success: true, 
          clientSecret: paymentResponse.clientSecret 
        };
      }

      // リダイレクト型の決済フロー
      if (paymentResponse.redirectUrl) {
        // 予約ステータスを更新
        await supabase
          .from('slot_bookings')
          .update({ payment_status: 'processing' })
          .eq('id', params.bookingId);
          
        return { 
          success: true, 
          redirectUrl: paymentResponse.redirectUrl 
        };
      }

      // データはあるがどちらも含まれていない場合
      const errorMessage = '決済処理の初期化に失敗しました。管理者にお問い合わせください。';
      setPaymentError(errorMessage);
      return { success: false, error: errorMessage };

    } catch (error: any) {
      const errorMessage = `決済の初期化中にエラーが発生しました: ${error.message || '不明なエラー'}`;
      setPaymentError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // コンテキスト値
  const value = {
    clientSecret,
    setClientSecret,
    isProcessing,
    setIsProcessing,
    paymentError,
    setPaymentError,
    paymentSuccess,
    setPaymentSuccess,
    handlePaymentCompleted,
    paymentType,
    setPaymentType,
    customAppearance,
    setCustomAppearance,
    resetPaymentState,
    initiatePayment
  };

  // Elements用のオプション
  const elementsOptions = clientSecret ? {
    clientSecret,
    appearance: customAppearance || defaultAppearance
  } : {};

  return (
    <StripeContext.Provider value={value}>
      <StripeProvider options={elementsOptions}>
        {children}
      </StripeProvider>
    </StripeContext.Provider>
  );
};

export default StripeContextProvider;