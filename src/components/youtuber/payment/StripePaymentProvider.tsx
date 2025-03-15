// src/components/youtuber/payment/StripePaymentProvider.tsx

import PaymentForm from './PaymentForm';
import StripeContextProvider from '../../../contexts/StripeContext';

/**
 * 決済フォームのラッパーコンポーネント
 * StripeContextProviderを提供してStripe関連の状態管理を行う
 */
interface StripePaymentProviderProps {
  slotId: string;       // 予約する掲載枠のID
  price: number;        // 支払い金額
  duration: number;     // 掲載期間（日数）
  videoUrl: string;     // 掲載するYouTube動画のURL
  onSuccess: () => void; // 決済成功時のコールバック
  onCancel: () => void;  // キャンセル時のコールバック
}

export default function StripePaymentProvider({
  slotId,
  price,
  duration,
  videoUrl,
  onSuccess,
  onCancel
}: StripePaymentProviderProps) {
  // このコンポーネントはStripeContextProviderを使用して状態管理を行い、
  // PaymentFormに必要なpropsを渡すだけのシンプルなラッパーです

  return (
    <StripeContextProvider>
      <PaymentForm
        slotId={slotId}
        price={price}
        duration={duration}
        videoUrl={videoUrl}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </StripeContextProvider>
  );
}