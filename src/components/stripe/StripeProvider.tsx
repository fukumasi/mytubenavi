// src/components/stripe/StripeProvider.tsx

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Appearance } from '@stripe/stripe-js';

// 公開キーを環境変数から取得 - 名前を正しく設定
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Stripeの初期化
const getStripe = () => {
  console.log('Stripe public key:', stripePublicKey); // デバッグ用のログ
  if (!stripePublicKey) {
    console.error('Stripe public key is not defined');
    return null;
  }
  
  return loadStripe(stripePublicKey);
};

// Stripeインスタンスを一度だけ作成
const stripePromise = getStripe();

// Stripeエレメントのアピアランス設定 - boxShadowを修正
const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#4f46e5', // インディゴ色 - Tailwindの indigo-600 に相当
    colorBackground: '#ffffff',
    colorText: '#1f2937', // グレー - Tailwindの gray-800 に相当
    colorDanger: '#ef4444', // 赤 - Tailwindの red-500 に相当
    fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
    borderRadius: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #e5e7eb', // Tailwindの gray-200 に相当
      boxShadow: 'none', // 問題のある値を修正
    },
    '.Input:focus': {
      border: '1px solid #4f46e5', // フォーカス時のボーダー
      boxShadow: '0 0 0 1px rgba(79, 70, 229, 0.2)',
    },
    '.Label': {
      fontWeight: '500',
      fontSize: '14px',
      color: '#4b5563', // Tailwindの gray-600 に相当
    },
    '.Button': {
      backgroundColor: '#4f46e5',
      fontSize: '16px',
      fontWeight: '600',
    },
  },
};

interface StripeProviderProps {
  children: React.ReactNode;
  options?: {
    clientSecret?: string;
    appearance?: Appearance;
  };
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ 
  children, 
  options = {} 
}) => {
  const [isReady, setIsReady] = useState<boolean>(!!stripePromise);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripePromise) {
      setError('Stripe initialization failed. Please check your API keys.');
      return;
    }
    setIsReady(true);
  }, []);

  // clientSecretがない場合はStripe Elementsを表示しない
  if (!options.clientSecret) {
    return <>{children}</>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
        <p className="font-medium">決済システムエラー</p>
        <p className="text-sm">{error}</p>
        <p className="text-sm mt-2">
          問題が解決しない場合は、サポートまでお問い合わせください。
        </p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">決済システムを準備中...</span>
      </div>
    );
  }

  // Elementsに渡すオプションを設定
  const elementsOptions = {
    ...options,
    appearance: options.appearance || appearance,
  };

  console.log('Initializing Stripe Elements with options:', elementsOptions);

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {children}
    </Elements>
  );
};

export default StripeProvider;