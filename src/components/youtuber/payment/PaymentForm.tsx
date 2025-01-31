//src/components/youtuber/payment/PaymentForm.tsx
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PaymentFormProps {
  slotId: string;
  price: number;
  duration: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentForm({ 
  slotId, 
  price, 
  duration,
  onSuccess, 
  onCancel 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    try {
      setLoading(true);
      setError(null);

      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/complete`,
        },
        redirect: 'if_required',
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      // 支払い成功時の処理
      await supabase.from('slot_bookings').insert([{
        slot_id: slotId,
        start_date: new Date(),
        end_date: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        payment_status: 'completed',
        amount: price
      }]);

      onSuccess();

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || '決済処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">お支払い情報</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
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
      </div>

      <form onSubmit={handleSubmit}>
        <PaymentElement />

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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !stripe}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '処理中...' : '支払いを確定'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}