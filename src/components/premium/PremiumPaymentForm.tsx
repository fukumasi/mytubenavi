import React, { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeContext } from '@/contexts/StripeContext';
import { 
  createSubscription, 
  STRIPE_PLANS,
  updatePremiumStatus
} from '@/services/stripeService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PremiumPaymentFormProps {
  selectedPlan: 'monthly' | 'quarterly' | 'yearly';
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
}

const PremiumPaymentForm: React.FC<PremiumPaymentFormProps> = ({ 
  selectedPlan, 
  onSuccess, 
  onCancel 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { 
    setClientSecret: setContextClientSecret, 
    setIsProcessing,
    setPaymentError,
    setPaymentSuccess,
    setPaymentType,
    paymentError,
    isProcessing,
    resetPaymentState
  } = useStripeContext();
  
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // 選択されたプランに基づく金額とプランID
  const getPlanDetails = () => {
    switch (selectedPlan) {
      case 'monthly':
        return { name: '月額プラン', amount: 980, priceId: STRIPE_PLANS.MONTHLY };
      case 'quarterly':
        return { name: '3ヶ月プラン', amount: 2800, priceId: STRIPE_PLANS.QUARTERLY };
      case 'yearly':
        return { name: '年間プラン', amount: 9800, priceId: STRIPE_PLANS.YEARLY };
      default:
        return { name: '月額プラン', amount: 980, priceId: STRIPE_PLANS.MONTHLY };
    }
  };

  const planDetails = getPlanDetails();

  useEffect(() => {
    // コンポーネントマウント時に状態をリセット
    resetPaymentState();
    
    // 決済タイプを設定
    setPaymentType('premium');
    
    // コンポーネント読み込み時にSubscription Intentを作成
    const initializePayment = async () => {
      if (!user) return;
      
      try {
        setInitializing(true);
        setPaymentError(null);
        
        // サブスクリプションを作成
        const { clientSecret, subscriptionId: id } = await createSubscription(
          planDetails.priceId
        );
        
        setContextClientSecret(clientSecret);
        setSubscriptionId(id);
      } catch (error) {
        console.error('Subscription initialization error:', error);
        setPaymentError(error instanceof Error ? error.message : '決済情報の初期化に失敗しました');
      } finally {
        setInitializing(false);
      }
    };

    initializePayment();
    
    // クリーンアップ関数
    return () => {
      resetPaymentState();
    };
  }, [user, selectedPlan, planDetails.priceId, setContextClientSecret, setPaymentError, resetPaymentState, setPaymentType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setPaymentError('決済システムの準備ができていません。時間をおいて再度お試しください。');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // クレジットカード情報を確認して支払いを完了
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/premium/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message || '支払い処理に失敗しました');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // プレミアムステータスを更新
        await updatePremiumStatus(true);
        
        // 支払い成功状態を設定
        setPaymentSuccess(true);
        
        // 成功コールバックを呼び出し
        onSuccess(subscriptionId!);
      } else {
        throw new Error('支払いが完了しませんでした。後ほど再度お試しください。');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error instanceof Error ? error.message : '支払い処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4">
        <LoadingSpinner />
        <p className="text-gray-600">決済情報を準備中...</p>
      </div>
    );
  }

  if (paymentError && !subscriptionId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-red-800 mb-2">エラーが発生しました</h3>
        <p className="text-sm text-red-600">{paymentError}</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">お支払い情報</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">選択したプラン: {planDetails.name}</p>
          <p className="text-sm text-gray-600">金額: ¥{planDetails.amount.toLocaleString()}</p>
        </div>
        
        <div className="p-3 border border-gray-300 rounded-md bg-white">
          <PaymentElement />
        </div>
        
        {paymentError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-sm text-red-600">
            {paymentError}
          </div>
        )}
      </div>
      
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isProcessing}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={!stripe || !elements || isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              処理中...
            </span>
          ) : 'お支払いを完了する'}
        </button>
      </div>
    </form>
  );
};

export default PremiumPaymentForm;