// src/components/youtuber/BookingHistory.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faCheckCircle, faClock, faExclamationCircle, faTimesCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SlotBookingWithPayment, PromotionSlot } from '@/types/promotion';
import { useNavigate } from 'react-router-dom';
import { getActiveBookings, cancelBooking, updateExpiredBookings } from '@/services/paymentService';
import { toast } from 'react-toastify';

// キャンセル確認モーダルのプロパティ型
interface CancelModalProps {
  isOpen: boolean;
  booking: SlotBookingWithPayment | null;
  onClose: () => void;
  onConfirm: (bookingId: string, reason: string) => void;
}

// キャンセル確認モーダルコンポーネント
const CancelBookingModal: React.FC<CancelModalProps> = ({ isOpen, booking, onClose, onConfirm }) => {
  const [reason, setReason] = useState<string>('');
  
  if (!isOpen || !booking) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">予約をキャンセルしますか？</h3>
        <p className="mb-4 text-gray-700">
          掲載枠「{booking.slot?.name}」の予約をキャンセルします。この操作は取り消せません。
        </p>
        <div className="mb-4">
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1">
            キャンセル理由（任意）
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="キャンセル理由を入力してください"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(booking.id, reason)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            予約をキャンセルする
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<SlotBookingWithPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // キャンセルモーダル用の状態
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<SlotBookingWithPayment | null>(null);

  useEffect(() => {
    // 期限切れの予約を自動的に更新
    const updateExpired = async () => {
      await updateExpiredBookings();
    };
    
    updateExpired();
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('ユーザー情報の取得に失敗しました');
        return;
      }

      // まず関連するYouTuberプロフィールを取得
      const { data: youtuberProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('YouTuberプロフィールの取得に失敗しました:', profileError);
        setError('プロフィール情報の取得に失敗しました');
        return;
      }

      // 有効な予約のみを取得
      const result = await getActiveBookings(youtuberProfile.id);
      
      if (!result.success) {
        setError(result.error || '予約履歴の取得に失敗しました');
        return;
      }

      // APIレスポンスをSlotBookingWithPayment型に変換
      const formattedBookings: SlotBookingWithPayment[] = result.data.map((item: any) => {
        // まず各プロパティを取得
        const slotData = item.promotion_slots || {};

        // PromotionSlot型に変換
        const slot: PromotionSlot = {
          id: slotData.id || '',
          name: slotData.name || '不明な掲載枠',
          type: (slotData.type as any) || 'premium', // 型キャスト
          price: slotData.price || 0,
        };

        // 日数を計算（必要な場合）
        const startDate = new Date(item.start_date);
        const endDate = new Date(item.end_date);
        const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // SlotBookingWithPayment型に整形
        return {
          id: item.id,
          user_id: youtuberProfile.id,
          youtuber_id: youtuberProfile.id,
          slot_id: item.slot_id,
          video_id: item.video_id,
          start_date: item.start_date,
          end_date: item.end_date,
          duration: durationDays || 1,
          status: item.status as any,
          amount: item.amount_paid || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
          payment_status: item.payment_status as any,
          payment_intent_id: item.payment_intent_id,
          // スロット情報とビデオ情報
          slot: slot,
          video: item.video,
          // 追加プロパティ
          amount_paid: item.amount_paid
        };
      });

      setBookings(formattedBookings);
    } catch (err) {
      console.error('予約履歴の取得中にエラーが発生しました:', err);
      setError('予約履歴の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'pending':
        return <FontAwesomeIcon icon={faClock} className="text-yellow-500" />;
      case 'completed':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-blue-500" />;
      case 'cancelled':
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />;
      default:
        return <FontAwesomeIcon icon={faExclamationCircle} className="text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string, paymentStatus?: string) => {
    // 支払いステータスが pending の場合、予約ステータスに関わらず未払いとして扱う
    if (paymentStatus === 'pending' || paymentStatus === 'processing') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">支払い待ち</span>;
    }
    
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">掲載中</span>;
      case 'pending':
        // 支払いは完了しているが掲載はまだの状態
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">掲載準備中</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">掲載完了</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">キャンセル</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">不明</span>;
    }
  };

  const getPaymentStatusLabel = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'succeeded':
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">支払済</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">未払い</span>;
      case 'processing':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">処理中</span>;
      case 'refunded':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">返金済</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">キャンセル</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">不明</span>;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('ja-JP')} 〜 ${end.toLocaleDateString('ja-JP')}`;
  };

  const getTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'premium':
        return 'プレミアム';
      case 'sidebar':
        return 'サイドバー';
      case 'genre':
        return 'ジャンル';
      case 'related':
        return '関連動画';
      default:
        return type || '不明';
    }
  };

  // 支払いが必要な予約の支払いを完了させる
  const handleCompletePayment = (bookingId: string, paymentIntentId?: string) => {
    if (!paymentIntentId) {
      toast.error('支払い情報が見つかりません。管理者にお問い合わせください。');
      return;
    }
    
    // Stripe決済の確認ページに遷移
    navigate(`/youtuber/payment/confirm?payment_intent=${paymentIntentId}&booking_id=${bookingId}`);
  };
  
  // 予約キャンセルモーダルを開く
  const handleOpenCancelModal = (booking: SlotBookingWithPayment) => {
    setSelectedBooking(booking);
    setCancelModalOpen(true);
  };
  
  // 予約キャンセルモーダルを閉じる
  const handleCloseCancelModal = () => {
    setSelectedBooking(null);
    setCancelModalOpen(false);
  };
  
  // 予約キャンセルを確定する
  const handleConfirmCancel = async (bookingId: string, reason: string) => {
    try {
      setLoading(true);
      
      const result = await cancelBooking(bookingId, reason);
      
      if (result.success) {
        toast.success('予約がキャンセルされました');
        // リストを更新
        fetchBookings();
      } else {
        toast.error(result.error || 'キャンセルに失敗しました');
      }
    } catch (err) {
      console.error('予約キャンセル中にエラーが発生しました:', err);
      toast.error('予約キャンセル中にエラーが発生しました');
    } finally {
      handleCloseCancelModal();
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded shadow">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
          {error}
        </div>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          再試行
        </button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-4">予約履歴</h2>
        <div className="mt-4 p-8 bg-gray-50 rounded-lg text-center">
          <FontAwesomeIcon icon={faCalendarAlt} className="text-4xl text-gray-400 mb-3" />
          <p className="text-gray-500 mb-4">有効な掲載枠の予約はありません</p>
          <button
            onClick={() => navigate('/youtuber/promotions')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            掲載枠を予約する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-6">有効な予約履歴</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                動画
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                掲載枠
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                掲載期間
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-16 bg-gray-100 rounded overflow-hidden">
                      {booking.video?.thumbnail ? (
                        <img
                          src={booking.video.thumbnail}
                          alt={booking.video?.title || ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gray-200">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {booking.video?.title || '不明な動画'}
                      </div>
                      {booking.video?.youtube_id && (
                        <div className="text-xs text-gray-500">
                          <a 
                            href={`https://www.youtube.com/watch?v=${booking.video.youtube_id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline text-blue-600"
                          >
                            YouTubeで見る
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{booking.slot?.name || '不明な掲載枠'}</div>
                  <div className="text-xs text-gray-500">{getTypeLabel(booking.slot?.type)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDateRange(booking.start_date, booking.end_date)}
                  </div>
                  <div className="text-xs text-gray-500">{booking.duration}日間</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {(booking.amount_paid || booking.amount)?.toLocaleString() || 0}円
                  </div>
                  <div className="text-xs">
                    {getPaymentStatusLabel(booking.payment_status)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(booking.status)}
                    <span className="ml-2">{getStatusLabel(booking.status, booking.payment_status)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {(booking.payment_status === 'pending' || booking.payment_status === 'processing') && (
                      <button
                        onClick={() => handleCompletePayment(booking.id, booking.payment_intent_id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                      >
                        支払う
                      </button>
                    )}
                    
                    {(booking.status === 'active' || booking.status === 'pending') && (
                      <button
                        onClick={() => handleOpenCancelModal(booking)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded flex items-center"
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-1" />
                        キャンセル
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* キャンセル確認モーダル */}
      <CancelBookingModal
        isOpen={cancelModalOpen}
        booking={selectedBooking}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
};

export default BookingHistory;