// src/contexts/StripeContext.tsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import StripeProvider from '../components/stripe/StripeProvider';
import { Appearance } from '@stripe/stripe-js';

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
}

// デフォルトの外観設定
const defaultAppearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#6366f1', // Indigo-600のカラーコード
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '4px'
  },
  rules: {
    '.Input': {
      boxShadow: 'none' // 問題のあるboxShadowを明示的に上書き
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
    resetPaymentState
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