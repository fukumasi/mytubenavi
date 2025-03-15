import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { AlertCircle } from 'lucide-react';
import { useStripeContext } from '../../../contexts/StripeContext';
import { createPromotionPayment, updatePromotionSlotStatus, extractYouTubeId, updateSlotYoutubeId } from '../../../services/stripeService';

interface PaymentFormProps {
  slotId: string;
  price: number;
  duration: number;
  videoUrl: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentForm({ 
  slotId, 
  price, 
  duration,
  videoUrl,
  onSuccess, 
  onCancel 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
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
  
  const [initializing, setInitializing] = useState(true);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  // YouTube URLからIDを抽出
  useEffect(() => {
    const extractedId = extractYouTubeId(videoUrl);
    setYoutubeId(extractedId);
    
    if (!extractedId) {
      setPaymentError('有効なYouTube URLが指定されていません');
    }
  }, [videoUrl, setPaymentError]);

  useEffect(() => {
    // コンポーネントマウント時に状態をリセット
    resetPaymentState();
    
    // 決済タイプを設定
    setPaymentType('promotion');
    
    // ページロード時に決済インテントを作成
    const initializePayment = async () => {
      try {
        setInitializing(true);
        setPaymentError(null);
        
        if (!youtubeId) {
          throw new Error('有効なYouTube URLが必要です');
        }
        
        // createPromotionPayment関数はexportYouTubeIdを内部で使用するので
        // 直接videoUrlを渡す
        const { clientSecret, paymentIntentId } = await createPromotionPayment(
          slotId,
          price,
          duration,
          videoUrl
        );
        
        setContextClientSecret(clientSecret);
        setPaymentIntentId(paymentIntentId);
      } catch (err: any) {
        console.error('Payment intent creation error:', err);
        setPaymentError(err.message || '決済準備に失敗しました');
      } finally {
        setInitializing(false);
      }
    };

    // YouTubeIDが取得できたら決済インテントを作成
    if (youtubeId) {
      initializePayment();
    }
    
    // クリーンアップ関数
    return () => {
      resetPaymentState();
    };
  }, [price, slotId, duration, videoUrl, youtubeId, setContextClientSecret, setPaymentError, resetPaymentState, setPaymentType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !youtubeId) {
      setPaymentError('決済システムの準備ができていません。時間をおいて再度お試しください。');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/youtuber/dashboard?payment=success`,
        },
        redirect: 'if_required',
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        try {
          // プロモーションスロット状態を更新
          await updatePromotionSlotStatus(paymentIntentId!, 'completed');
          
          // バックアップ処理: YouTube IDを直接掲載枠に設定
          // (決済完了時に自動的に行われる処理のバックアップ)
          await updateSlotYoutubeId(slotId, youtubeId);
          
          // 支払い成功状態を設定
          setPaymentSuccess(true);
          
          // 成功コールバックを呼び出し
          onSuccess();
        } catch (updateError) {
          console.error('Slot update error:', updateError);
          // 状態更新に失敗しても決済自体は成功しているので、成功として扱う
          setPaymentSuccess(true);
          onSuccess();
        }
      } else {
        throw new Error('お支払いが完了していません。もう一度お試しいただくか、別の決済方法をお試しください。');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentError(err.message || '決済処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (initializing) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3">決済情報を準備中...</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">お支払い情報</h2>

      {paymentError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{paymentError}</span>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-md p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">お支払い金額</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">掲載期間: {duration}日間</span>
          <span className="text-lg font-medium text-gray-900">
            ¥{price.toLocaleString()}
          </span>
        </div>
        
        {/* YouTubeサムネイルのプレビュー表示 */}
        {youtubeId && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">掲載動画のプレビュー</h3>
            <div className="aspect-video max-w-xs mx-auto">
              <img
                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} 
                alt="YouTube サムネイル"
                className="rounded-md w-full h-auto object-cover"
                onError={(e) => {
                  // 画像読み込みエラー時にプレースホルダー表示
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // 無限ループ防止
                  target.src = '/placeholder.jpg'; // プレースホルダー画像
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              動画ID: {youtubeId}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
          <PaymentElement />
        </div>

        <div className="mt-6 space-y-4">
          <div className="text-sm text-gray-500">
            <ul className="list-disc list-inside space-y-1">
              <li>クレジットカード情報は暗号化されて安全に処理されます</li>
              <li>請求は掲載開始時に一括で行われます</li>
              <li>キャンセルポリシーは利用規約をご確認ください</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isProcessing || !stripe || !elements || !youtubeId}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : '支払いを確定'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}