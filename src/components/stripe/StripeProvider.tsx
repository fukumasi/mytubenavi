// src/components/stripe/StripeProvider.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Appearance } from '@stripe/stripe-js';
import { getStripe } from '@/lib/stripe';
import { useStripeContext } from '@/contexts/StripeContext';
import { stripeService } from '@/services/stripeService';

// Stripeエレメントのアピアランス設定
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

// 実際の決済フォームコンポーネント
const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { handlePaymentCompleted, clientSecret } = useStripeContext();

  // 支払インテントIDを抽出する関数
  const extractPaymentIntentId = (clientSecret: string): string => {
    // client_secretは通常「pi_XXXX_secret_YYYY」の形式
    const parts = clientSecret.split('_secret_');
    return parts[0];
  };

  // 支払い成功後の処理
  const handleSuccess = useCallback(() => {
    console.log('支払い成功処理を実行します');
    setIsCompleted(true);
    handlePaymentCompleted();
    
    // 明示的にリダイレクト
    setTimeout(() => {
      window.location.href = `${window.location.origin}/youtuber/dashboard?payment=success`;
    }, 1000);
  }, [handlePaymentCompleted]);

  // コンポーネントマウント時に支払い状態をチェック
  useEffect(() => {
    const checkCurrentStatus = async () => {
      if (!clientSecret) return;
      
      try {
        const paymentIntentId = extractPaymentIntentId(clientSecret);
        const statusResponse = await stripeService.checkPaymentStatus(paymentIntentId);
        console.log('現在の支払いステータス:', statusResponse);
        
        if (statusResponse.status === 'succeeded') {
          console.log('支払いは既に完了しています');
          handleSuccess();
        }
      } catch (err) {
        console.error('支払い状態チェックエラー:', err);
      }
    };
    
    checkCurrentStatus();
  }, [clientSecret, handleSuccess]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret || isCompleted) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // まず現在の支払いインテントの状態をチェック
      const paymentIntentId = extractPaymentIntentId(clientSecret);
      const status = await stripeService.checkPaymentStatus(paymentIntentId);
      
      console.log('現在の支払いステータス:', status);
      
      // すでに処理中や完了している場合は早期リターン
      if (status.status === 'succeeded') {
        handleSuccess();
        setIsLoading(false);
        return;
      }
      
      if (status.status === 'processing') {
        console.log('支払いは処理中です');
        setErrorMessage('お支払いは現在処理中です。しばらくお待ちください。');
        setIsLoading(false);
        return;
      }

      // 支払い方法の確認
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/youtuber/dashboard?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // 支払いの確認中にエラーが発生
        console.error('決済エラー:', error);
        setErrorMessage(error.message || '支払い処理中にエラーが発生しました。');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // 支払いが成功
        console.log('決済成功:', paymentIntent);
        handleSuccess();
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // 追加のアクションが必要
        console.log('追加の認証が必要です:', paymentIntent);
        setErrorMessage('お支払いには追加の認証が必要です。画面の指示に従ってください。');
      } else if (paymentIntent) {
        // その他の状態
        console.log('決済状態:', paymentIntent.status);
        setErrorMessage(`決済は${paymentIntent.status}状態です。ページを更新せずにお待ちください。`);
      } else {
        // 予期しない応答
        console.warn('予期しない応答:', paymentIntent);
        setErrorMessage('決済処理中に予期しない状況が発生しました。管理者にお問い合わせください。');
      }
    } catch (err) {
      console.error('決済処理中の例外:', err);
      setErrorMessage('決済処理中にエラーが発生しました。再度お試しいただくか、サポートにお問い合わせください。');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="max-w-md mx-auto p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h3 className="text-lg font-medium text-green-800 mb-2">お支払いが完了しました</h3>
        <p className="text-green-700 mb-4">ご予約ありがとうございます。ダッシュボードに移動します...</p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-24 bg-green-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">お支払い情報を入力してください</h3>
        
        <div className="mb-6">
          <PaymentElement />
        </div>
        
        {errorMessage && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {errorMessage}
          </div>
        )}
        
        <button
          type="submit"
          disabled={!stripe || isLoading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              処理中...
            </span>
          ) : (
            '支払いを完了する'
          )}
        </button>
      </form>
    </div>
  );
};

// 決済モーダル
const PaymentModal = ({ clientSecret, onClose }: { clientSecret: string; onClose: () => void }) => {
  const stripePromiseInstance = getStripe();
  
  // 新しいElements設定オブジェクト
  const options = { 
    clientSecret,
    appearance
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">お支払い</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="閉じる"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {stripePromiseInstance && clientSecret && (
            <Elements stripe={stripePromiseInstance} options={options} key={clientSecret}>
              <CheckoutForm />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { clientSecret, resetPaymentState, paymentSuccess } = useStripeContext();

  useEffect(() => {
    const loadStripeJs = async () => {
      try {
        const stripe = getStripe();
        setIsReady(!!stripe);
      } catch (err) {
        console.error('Stripe initialization error:', err);
        setError('決済システムの初期化に失敗しました。');
      }
    };

    loadStripeJs();
  }, []);

  // 支払い成功時のリダイレクト処理
  useEffect(() => {
    if (paymentSuccess) {
      console.log('支払い成功を検出しました。ダッシュボードにリダイレクトします。');
      // リダイレクト用タイマーをセット
      const redirectTimer = setTimeout(() => {
        window.location.href = `${window.location.origin}/youtuber/dashboard?payment=success`;
      }, 2000);
      
      // クリーンアップ関数
      return () => clearTimeout(redirectTimer);
    }
  }, [paymentSuccess]);

  const handleCloseModal = () => {
    resetPaymentState();
  };

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
      <>
        {children}
        {clientSecret && (
          <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black bg-opacity-50">
            <div className="bg-white p-8 rounded-lg shadow-xl">
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-gray-600">決済システムを準備中...</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {children}
      
      {/* 決済成功時の通知 */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">お支払いが完了しました</h3>
              <p className="mt-2 text-sm text-gray-500">ダッシュボードに移動しています...</p>
              <div className="mt-4">
                <div className="animate-pulse flex justify-center">
                  <div className="h-2 w-24 bg-blue-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 決済モーダル - clientSecretがある場合のみ表示 */}
      {clientSecret && !paymentSuccess && (
        <PaymentModal 
          clientSecret={clientSecret} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
};

export default StripeProvider;