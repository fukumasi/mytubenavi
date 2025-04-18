import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { AlertCircle } from 'lucide-react';
import { useStripeContext } from '@/contexts/StripeContext';
import { createPromotionPayment, updatePromotionSlotStatus, extractYouTubeId } from '@/services/stripeService';
import { supabase } from '@/lib/supabase';

interface PaymentFormProps {
  slotId: string;
  price: number;
  duration: number;
  videoUrl: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// updateSlotYoutubeId関数の実装
const updateSlotYoutubeId = async (slotId: string, youtubeId: string | null) => {
  try {
    const { error } = await supabase
      .from('promotion_slots')
      .update({ youtube_id: youtubeId })
      .eq('id', slotId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('YouTubeID更新エラー:', error);
    return { success: false, error };
  }
};

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
    // videoUrl が変更されたら、まずエラーをクリアし、ID抽出を試みる
    setPaymentError(null); // URL変更時に既存のエラーをクリア
    const extractedId = extractYouTubeId(videoUrl);
    setYoutubeId(extractedId); // null の可能性もある

    if (!extractedId && videoUrl) { // URLが入力されているのにIDが抽出できなかった場合
      setPaymentError('有効なYouTube動画のURLを入力してください。');
    }
  }, [videoUrl, setPaymentError]); // 依存配列に setPaymentError を追加

  useEffect(() => {
    // コンポーネントマウント時に状態をリセット
    resetPaymentState();

    // 決済タイプを設定
    setPaymentType('promotion');

    // 決済インテントを作成する非同期関数
    const initializePayment = async () => {
      try {
        setInitializing(true);
        setPaymentError(null); // 初期化開始時にエラーをクリア

        if (!youtubeId) {
          // この時点では youtubeId が null の可能性があるのでエラーにしない
          // 有効なURLがないというエラーは上の useEffect で処理
          console.log('YouTube ID is not available yet.');
          setInitializing(false); // YouTube IDがない場合は初期化完了とする
          return; // IDがない場合は処理を中断
        }

        // IDが有効な場合のみ決済インテントを作成
        const { clientSecret, paymentIntentId: piId, error } = await createPromotionPayment(
          slotId,
          price,
          duration,
          videoUrl // createPromotionPayment 内部で videoId (UUID) を使うように変更されている可能性があるため videoUrl を渡す
        );

        if (error || !clientSecret || !piId) {
          throw new Error(error || '決済情報の取得に失敗しました。');
        }

        setContextClientSecret(clientSecret);
        setPaymentIntentId(piId);
      } catch (err: any) {
        console.error('Payment intent creation error:', err);
        // エラーメッセージが undefined の場合のフォールバックを追加
        setPaymentError(err.message ?? '決済準備中に予期しないエラーが発生しました。');
      } finally {
        setInitializing(false);
      }
    };

    // YouTubeID が有効な場合に決済インテント初期化を実行
    // videoUrl が変更されても、有効な youtubeId が得られてから実行される
    if (youtubeId) {
      initializePayment();
    } else if (!videoUrl) {
      // videoUrl が空の場合も初期化処理を終える
      setInitializing(false);
    }
    // videoUrl があるが youtubeId が null の場合は、上の useEffect でエラーが表示されるのを待つか、
    // initializePayment 内で return される

    // クリーンアップ関数
    return () => {
      resetPaymentState();
    };
    // 依存配列に youtubeId を追加し、IDが変わったときに再初期化するようにする
  }, [price, slotId, duration, videoUrl, youtubeId, setContextClientSecret, setPaymentError, resetPaymentState, setPaymentType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !youtubeId) {
      setPaymentError('決済システムの準備ができていません。動画URLを確認するか、時間をおいて再度お試しください。');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // 決済完了後のリダイレクト先URL
          return_url: `${window.location.origin}/youtuber/dashboard?payment=success`,
        },
        // 即時リダイレクトさせず、結果をここで処理する
        redirect: 'if_required',
      });

      if (paymentError) {
        // エラーメッセージが undefined の場合に備えてデフォルトメッセージを設定
        throw new Error(paymentError.message ?? 'Stripe 決済確認中に不明なエラーが発生しました。');
      }

      // 決済が成功した場合の処理
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // paymentIntentId と youtubeId が存在することを再確認 (TypeScriptのための型ガード)
        if (paymentIntentId && youtubeId) {
          try {
            // プロモーションスロット状態を 'completed' に更新
            await updatePromotionSlotStatus(paymentIntentId, 'completed');

            // バックアップ処理: YouTube IDを直接掲載枠に設定 (string型を渡す)
            await updateSlotYoutubeId(slotId, youtubeId); // ★エラー1修正: youtubeId は string であることが保証される

            // 支払い成功状態を設定
            setPaymentSuccess(true);

            // 成功コールバックを呼び出し
            onSuccess();
          } catch (updateError: any) {
            console.error('Slot update error after payment:', updateError);
            // 状態更新に失敗しても決済自体は成功しているので、成功として扱う
            setPaymentSuccess(true);
            // エラーメッセージを表示するかもしれない
            setPaymentError(`決済は成功しましたが、掲載情報の更新に失敗しました: ${updateError.message ?? '不明なエラー'}`);
            // 成功コールバックも呼ぶ（決済は完了しているため）
            onSuccess();
          }
        } else {
          // このパスは理論上到達しにくいが、念のためエラーハンドリング
          console.error('Payment succeeded but paymentIntentId or youtubeId is unexpectedly missing.');
          setPaymentError('決済後の処理中に予期しないエラーが発生しました (IDが見つかりません)。');
        }
      } else if (paymentIntent) {
         // 支払いステータスが succeeded 以外の場合 (例: requires_action)
         setPaymentError(`支払いが完了しませんでした。ステータス: ${paymentIntent.status}`);
      } else {
         // paymentIntent 自体が存在しない異常ケース
         throw new Error('決済結果の取得に失敗しました。');
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      // エラーメッセージが undefined の場合に備えてデフォルトメッセージを設定
      setPaymentError(err.message ?? '決済処理中に不明なエラーが発生しました。'); // ★エラー2修正(推測): undefined を避ける
    } finally {
      setIsProcessing(false);
    }
  };

  // 初期化中の表示
  if (initializing) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3">決済情報を準備中...</span>
      </div>
    );
  }

  // Stripe Elements の準備ができていない、または YouTube ID が無効な場合の表示
  // (ClientSecretがまだ取得できていない場合など)
  // paymentIntentId は clientSecret から生成されるので、要素の準備状況を見る方が適切かもしれない
  if (!stripe || !elements || !youtubeId) {
     return (
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">お支払い情報</h2>
         {paymentError && ( // YouTube URL無効エラーなどもここで表示される
           <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
             <div className="flex items-center text-red-600">
               <AlertCircle className="h-5 w-5 mr-2" />
               <span className="text-sm">{paymentError}</span>
             </div>
           </div>
         )}
         {!paymentError && ( // 一般的な準備中メッセージ
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
               決済フォームを読み込んでいます。有効なYouTube URLが指定されているか確認してください。
            </div>
         )}
         <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
         </div>
      </div>
     );
  }


  // 支払いフォームのレンダリング
  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">お支払い情報</h2>

      {/* 支払いエラーメッセージ */}
      {paymentError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{paymentError}</span>
          </div>
        </div>
      )}

      {/* 支払い概要 */}
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
                  target.src = '/placeholder.jpg'; // 事前に用意したプレースホルダー画像のパス
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              動画ID: {youtubeId}
            </p>
          </div>
        )}
      </div>

      {/* Stripe Payment Element */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
          <PaymentElement />
        </div>

        {/* 注意事項とボタン */}
        <div className="mt-6 space-y-4">
          <div className="text-sm text-gray-500">
            <ul className="list-disc list-inside space-y-1">
              <li>クレジットカード情報はStripeによって安全に処理され、当サービスサーバーには保存されません。</li>
              <li>請求は掲載開始時に一括で行われます。</li>
              <li>キャンセルポリシーは利用規約をご確認ください。</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              // Stripe, Elements, youtubeId が準備完了かつ処理中でない場合のみ有効
              disabled={isProcessing || !stripe || !elements || !youtubeId}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </span>
              ) : `¥${price.toLocaleString()} を支払う`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}