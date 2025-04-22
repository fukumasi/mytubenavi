// src/components/youtuber/PromotionDashboard.tsx

import { useState, useEffect } from 'react';
import { 
  Upload,
  Edit,
  Trash2,
  DollarSign,
  ImageIcon,
  AlertTriangle,
  BarChart2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile, PromotionSlot } from '@/types';
import type { SlotBookingWithPayment } from '@/types/promotion';
import { formatDate } from "@/utils/dateUtils";
import CreateSlotModal from './CreateSlotModal';
import EditSlotModal from './EditSlotModal';
import BookingForm from './BookingForm';
import { getActiveBookings, cancelBooking, updateExpiredBookings } from '@/services/paymentService';
import { toast } from 'react-toastify';
import AnalyticsDashboard from './AnalyticsDashboard'; // 追加: AnalyticsDashboardのインポート

// 拡張型の定義を追加
interface ExtendedPromotionSlot extends PromotionSlot {
  bookings?: { count: number }[];
}

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
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">予約をキャンセルしますか？</h3>
        <p className="mb-4 text-gray-700 dark:text-dark-text-secondary">
          掲載枠「{booking.slot?.name}」の予約をキャンセルします。この操作は取り消せません。
        </p>
        <div className="mb-4">
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            キャンセル理由（任意）
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="キャンセル理由を入力してください"
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-dark-surface dark:text-dark-text-primary"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-dark-text-primary rounded"
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(booking.id, reason)}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white rounded"
          >
            予約をキャンセルする
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PromotionDashboard() {
  const { user, youtuberProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  // 型をExtendedPromotionSlotに変更
  const [promotionSlots, setPromotionSlots] = useState<ExtendedPromotionSlot[]>([]);
  const [bookings, setBookings] = useState<SlotBookingWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings' | 'analytics'>('slots');
  
  // 追加: 分析タブのサブタブ状態を管理する
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'cost' | 'performance'>('cost');
  
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0
  });

  // キャンセルモーダル用の状態
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<SlotBookingWithPayment | null>(null);

  // モーダル制御のための状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  // こちらも型を変更
  const [selectedSlot, setSelectedSlot] = useState<ExtendedPromotionSlot | null>(null);

  useEffect(() => {
    // 期限切れの予約を自動的に更新
    const updateExpired = async () => {
      await updateExpiredBookings();
    };
    
    updateExpired();
    fetchData();
  }, [user, youtuberProfile]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);

    try {
      if (!youtuberProfile) {
        setError('YouTuberプロフィールが未登録です');
        return;
      }

      // プロフィールと掲載枠を取得
      const [profileResult, slotsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('promotion_slots')
          .select(`
            *,
            bookings:slot_bookings(
              count
            )
          `)
          .eq('is_active', true)
      ]);
      
      if (profileResult.error) throw profileResult.error;
      if (slotsResult.error) throw slotsResult.error;
      
      setProfile(profileResult.data);
      setPromotionSlots(slotsResult.data);

      // 有効な予約のみを取得
      const bookingResult = await getActiveBookings(youtuberProfile.id);
      
      if (!bookingResult.success) {
        throw new Error(bookingResult.error || '予約データの取得に失敗しました');
      }

      // APIレスポンスをSlotBookingWithPayment型に変換
      const formattedBookings: SlotBookingWithPayment[] = bookingResult.data.map((item: any) => {
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
      
      // Analytics データの計算
      const completedBookings = formattedBookings.filter(b => b.status === 'completed');
      const activeBookings = formattedBookings.filter(b => b.status === 'active');
      
      setAnalyticsData({
        totalRevenue: formattedBookings.reduce((sum, booking) => sum + (booking.amount_paid || 0), 0),
        totalBookings: formattedBookings.length,
        activeBookings: activeBookings.length,
        completedBookings: completedBookings.length
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = () => {
    setSelectedSlot(null);
    setShowCreateModal(true);
  };

  const handleEditSlot = (slotId: string) => {
    const slot = promotionSlots.find(s => s.id === slotId);
    if (slot) {
      setSelectedSlot(slot);
      setShowEditModal(true);
    }
  };

  const handleCreateBooking = () => {
    setShowBookingModal(true);
  };

  const handleDeleteSlot = async (slotId: string) => {
    const slot = promotionSlots.find(s => s.id === slotId);
    const bookingsCount = slot?.bookings?.[0]?.count ?? 0;

    if (bookingsCount > 0) {
      alert('アクティブな予約が存在するため削除できません');
      return;
    }

    if (!window.confirm('この掲載枠を削除してもよろしいですか？')) return;

    try {
      console.log('削除を開始: slotId =', slotId);
      
      // 直接削除処理を実行
      const { data, error } = await supabase
        .from('promotion_slots')
        .delete()
        .eq('id', slotId)
        .select();

      console.log('削除の結果:', { data, error });
      
      if (error) {
        console.error('削除エラー詳細:', error);
        
        // エラーの内容に応じて処理を変更
        if (error.code === '42501') { // パーミッションエラー
          console.log('削除の権限がありません。論理削除を試みます。');
          
          // 論理削除を試みる
          const { error: updateError } = await supabase
            .from('promotion_slots')
            .update({ is_active: false })
            .eq('id', slotId);
            
          if (updateError) {
            console.error('論理削除エラー:', updateError);
            throw updateError;
          }
          
          console.log('論理削除が成功しました');
        } else {
          // その他のエラー
          throw error;
        }
      }
      
      // 削除確認
      const { data: checkData, error: checkError } = await supabase
        .from('promotion_slots')
        .select('id, is_active')
        .eq('id', slotId);
        
      console.log('削除確認:', { stillExists: checkData && checkData.length > 0, checkData, checkError });
      
      if (checkData && checkData.length > 0) {
        // 物理削除に失敗した場合、データが残っている
        console.log('物理削除に失敗したようです。データが依然として存在します。');
        
        // 論理削除を試みる
        const { error: updateError } = await supabase
          .from('promotion_slots')
          .update({ is_active: false })
          .eq('id', slotId);
          
        if (updateError) {
          console.error('論理削除エラー:', updateError);
          throw updateError;
        }
        
        console.log('論理削除が成功しました');
      } else {
        console.log('物理削除が成功しました。データが存在しません。');
      }

      // UIからの削除
      setPromotionSlots(slots => slots.filter(slot => slot.id !== slotId));
      
      // 最新データの再取得
      refreshData();
      
    } catch (err) {
      console.error('Error deleting slot:', err);
      alert('削除に失敗しました: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          アクティブ
        </span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          完了
        </span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          キャンセル
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          保留中
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
          {status}
        </span>;
    }
  };

  const getPaymentStatusLabel = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'succeeded':
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">支払済</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium">未払い</span>;
      case 'processing':
        return <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">処理中</span>;
      case 'refunded':
        return <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-medium">返金済</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium">キャンセル</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium">不明</span>;
    }
  };

  // 現在の予約をCSV形式でエクスポート
  const handleExportCSV = () => {
    const headers = ['予約ID', '掲載枠', '動画タイトル', '金額', '状態', '予約日', '開始日', '終了日'];
    
    const csvRows = [
      headers.join(','),
      ...bookings.map(booking => [
        booking.id,
        booking.slot?.name || '',
        booking.video?.title || '',
        booking.amount_paid ? `¥${booking.amount_paid.toLocaleString()}` : '¥0',
        booking.status,
        formatDate(booking.created_at),
        formatDate(booking.start_date),
        formatDate(booking.end_date)
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `予約データ_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      // 掲載枠データを更新
      const { data: slotsData, error: slotsError } = await supabase
        .from('promotion_slots')
        .select(`
          *,
          bookings:slot_bookings(
            count
          )
        `)
        .eq('is_active', true);  // アクティブな掲載枠のみに限定
        
      if (slotsError) throw slotsError;
      setPromotionSlots(slotsData);
  
      // 予約データを更新（有効なもののみ）
      if (youtuberProfile?.id) {
        const bookingResult = await getActiveBookings(youtuberProfile.id);
        
        if (!bookingResult.success) {
          throw new Error(bookingResult.error || '予約データの取得に失敗しました');
        }
        
        // APIレスポンスをSlotBookingWithPayment型に変換
        const formattedBookings: SlotBookingWithPayment[] = bookingResult.data.map((item: any) => {
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
  
        // Analytics データの再計算
        const completedBookings = formattedBookings.filter(b => b.status === 'completed');
        const activeBookings = formattedBookings.filter(b => b.status === 'active');
        
        setAnalyticsData({
          totalRevenue: formattedBookings.reduce((sum, booking) => sum + (booking.amount_paid || 0), 0),
          totalBookings: formattedBookings.length,
          activeBookings: activeBookings.length,
          completedBookings: completedBookings.length
        });
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      toast.error('データの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // モーダルが成功した後の処理
  const handleSlotSuccess = () => {
    refreshData();
  };

  // 予約モーダルが成功した後の処理
  const handleBookingSuccess = () => {
    refreshData();
    setShowBookingModal(false);
    setActiveTab('bookings');
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
        refreshData();
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

  // 支払いが必要な予約の支払いを完了させる
  const handleCompletePayment = (bookingId: string, paymentIntentId?: string) => {
    if (!paymentIntentId) {
      toast.error('支払い情報が見つかりません。管理者にお問い合わせください。');
      return;
    }
    
    // Stripe決済の確認ページに遷移
    window.location.href = `/youtuber/payment/confirm?payment_intent=${paymentIntentId}&booking_id=${bookingId}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">YouTuberダッシュボード</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            動画プロモーションの管理とデータ分析
          </p>
        </div>
        
        <div className="flex items-center space-x-2 bg-white dark:bg-dark-surface rounded-lg shadow-sm p-1">
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'slots' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-dark-text-secondary'
            }`}
            onClick={() => setActiveTab('slots')}
          >
            <Upload className="inline-block w-4 h-4 mr-1 align-text-bottom" />
            掲載枠
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'bookings' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-dark-text-secondary'
            }`}
            onClick={() => setActiveTab('bookings')}
          >
            <FileText className="inline-block w-4 h-4 mr-1 align-text-bottom" />
            予約
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-dark-text-secondary'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 className="inline-block w-4 h-4 mr-1 align-text-bottom" />
            分析
          </button>
        </div>
      </div>

      {/* 動画掲載予約ボタン (常に表示) */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold text-white">動画掲載を開始しましょう</h3>
            <p className="text-blue-100 mt-1">
              作成した掲載枠に動画を掲載して、視聴者層を拡大しましょう
            </p>
          </div>
          <button
            onClick={handleCreateBooking}
            className="px-6 py-3 bg-white dark:bg-gray-200 text-blue-600 dark:text-blue-700 font-medium rounded-lg shadow hover:bg-blue-50 dark:hover:bg-gray-100 transition-colors"
          >
            <Calendar className="inline-block w-5 h-5 mr-2 align-text-bottom" />
            動画掲載を予約する
          </button>
        </div>
      </div>

      {/* アナリティクスカード（常に表示） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 mr-4">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">
                総掲載費
              </p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              ¥{analyticsData.totalRevenue.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 mr-4">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">
                予約数
              </p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                {analyticsData.totalBookings}件
              </h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 mr-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">
                アクティブな予約
              </p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                {analyticsData.activeBookings}件
              </h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 mr-4">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">
                完了した予約</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                {analyticsData.completedBookings}件
              </h3>
            </div>
          </div>
        </div>
      </div>

  {/* メインコンテンツ */}
  <div className="flex flex-col lg:flex-row gap-8">
        {activeTab === 'slots' && (
          <>
            {/* サイドバー */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-4">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                      {youtuberProfile?.username || profile?.username}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">YouTuber</p>
                  </div>
                </div>

                <button 
                  onClick={handleCreateSlot}
                  className="w-full bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-800 transition-colors mb-6"
                >
                  <Upload className="inline-block w-4 h-4 mr-2" />
                  掲載枠を登録する
                </button>

                <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  <p>※ 掲載枠は最大5つまで作成できます</p>
                  <p className="mt-1">※ アクティブな予約がある掲載枠は削除できません</p>
                </div>
              </div>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-grow">
              <div className="space-y-8">
                <section>
                  <div className="flex items-center mb-4">
                    <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">掲載枠管理</h2>
                  </div>
                  
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300 mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">読み込み中...</p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm">
                      <div className="p-6 border-b border-gray-200 dark:border-dark-border">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">
                            掲載枠一覧 
                            <span className="ml-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                              ({promotionSlots.length}/5)
                            </span>
                          </h2>
                          <button 
                            onClick={handleCreateSlot}
                            disabled={promotionSlots.length >= 5}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            新規作成
                          </button>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-gray-200 dark:divide-dark-border">
                        {promotionSlots.length === 0 ? (
                          <div className="p-6 text-center text-gray-500 dark:text-dark-text-secondary">
                            掲載枠がまだ登録されていません
                          </div>
                        ) : (
                          promotionSlots.map(slot => {
                            const bookingsCount = slot.bookings?.[0]?.count ?? 0;
                            return (
                              <div key={slot.id} className="p-6 flex items-start space-x-4">
                                <div className="relative flex-shrink-0 w-48">
                                  {slot.image_url ? (
                                    <img 
                                      src={slot.image_url} 
                                      alt={slot.name}
                                      className="w-full h-32 object-cover rounded-lg"
                                    />
                                  ) : (
                                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                      <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{slot.name}</h3>
                                  <div className="mt-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                                    <p>{slot.description}</p>
                                    <p className="mt-1">価格: ¥{slot.price.toLocaleString()}/日</p>
                                    {bookingsCount > 0 && (
                                      <p className="mt-1 text-indigo-600 dark:text-indigo-400">
                                        アクティブな予約: {bookingsCount}件
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button 
                                    onClick={() => handleEditSlot(slot.id)}
                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    disabled={bookingsCount > 0}
                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:hover:text-gray-300 dark:disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}

        {activeTab === 'bookings' && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">予約管理</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateBooking}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  新規予約
                </button>
                <button
                  onClick={refreshData}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  更新
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  CSVエクスポート
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 bg-white dark:bg-dark-surface rounded-lg shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">読み込み中...</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden">
                {bookings.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-dark-text-secondary">
                    予約データがありません
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            予約情報
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            掲載枠
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            金額
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            期間
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            状態
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            決済情報
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            アクション
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 relative">
                                  {booking.video?.thumbnail ? (
                                    <img
                                      className="h-10 w-10 rounded object-cover"
                                      src={booking.video.thumbnail}
                                      alt=""
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                      <ImageIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4 max-w-xs truncate">
                                  <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary truncate">
                                    {booking.video?.title || "タイトルなし"}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                    予約ID: {booking.id.substring(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-dark-text-primary">{booking.slot?.name || "不明"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                                ¥{booking.amount_paid?.toLocaleString() || 0}
                              </div>
                              <div className="text-xs">
                                {getPaymentStatusLabel(booking.payment_status)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                                {formatDate(booking.start_date)} 〜 {formatDate(booking.end_date)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                {booking.duration ? `${booking.duration}日間` : ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(booking.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-text-secondary">
                              {booking.payment_intent_id ? (
                                <>
                                  <div className="text-xs">
                                    {booking.payment_intent_id.substring(0, 12)}...
                                  </div>
                                  <div className="text-xs mt-1">
                                    {formatDate(booking.created_at)}
                                  </div>
                                </>
                              ) : (
                                '未決済'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                {(booking.payment_status === 'pending' || booking.payment_status === 'processing') && (
                                  <button
                                    onClick={() => handleCompletePayment(booking.id, booking.payment_intent_id)}
                                    className="px-3 py-1 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white text-xs rounded"
                                  >
                                    支払う
                                  </button>
                                )}
                                
                                {(booking.status === 'active' || booking.status === 'pending') && (
                                  <button
                                    onClick={() => handleOpenCancelModal(booking)}
                                    className="px-3 py-1 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white text-xs rounded flex items-center"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
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
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="w-full">
            {/* 分析タブのサブタブナビゲーション */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <BarChart2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">分析</h2>
              </div>
              
              {/* 追加: サブタブナビゲーション */}
              <div className="flex items-center space-x-2 bg-white dark:bg-dark-surface rounded-lg shadow-sm p-1">
                <button 
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    analyticsSubTab === 'cost' 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-dark-text-secondary'
                  }`}
                  onClick={() => setAnalyticsSubTab('cost')}
                >
                  <DollarSign className="inline-block w-4 h-4 mr-1 align-text-bottom" />
                  費用分析
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    analyticsSubTab === 'performance' 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-dark-text-secondary'
                  }`}
                  onClick={() => setAnalyticsSubTab('performance')}
                >
                  <BarChart2 className="inline-block w-4 h-4 mr-1 align-text-bottom" />
                  掲載効果分析
                </button>
              </div>
            </div>

            {/* 条件分岐: 費用分析または掲載効果分析を表示 */}
            {analyticsSubTab === 'cost' ? (
              <>
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-4">費用サマリー</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary mb-2">総予約数</h4>
                        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{analyticsData.totalBookings}件</p>
                      </div>
                    </div>
                    
                    <div>
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary mb-2">ステータス別予約</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">アクティブ</span>
                            <div className="flex items-center">
                              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mr-2">
                                <div 
                                  className="h-full bg-green-500 dark:bg-green-600 rounded-full" 
                                  style={{ 
                                    width: `${analyticsData.totalBookings 
                                      ? (analyticsData.activeBookings / analyticsData.totalBookings * 100) 
                                      : 0}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                                {analyticsData.activeBookings}件
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-dark-text-secondary">完了</span>
                            <div className="flex items-center">
                              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mr-2">
                                <div 
                                  className="h-full bg-blue-500 dark:bg-blue-600 rounded-full" 
                                  style={{ 
                                    width: `${analyticsData.totalBookings 
                                      ? (analyticsData.completedBookings / analyticsData.totalBookings * 100) 
                                      : 0}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                                {analyticsData.completedBookings}件
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">その他</span>
                            <div className="flex items-center">
                              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mr-2">
                                <div 
                                  className="h-full bg-gray-500 dark:bg-gray-600 rounded-full" 
                                  style={{ 
                                    width: `${analyticsData.totalBookings 
                                      ? ((analyticsData.totalBookings - analyticsData.activeBookings - analyticsData.completedBookings) / analyticsData.totalBookings * 100) 
                                      : 0}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                                {analyticsData.totalBookings - analyticsData.activeBookings - analyticsData.completedBookings}件
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary mb-4">予約データ詳細</h4>
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
                      詳細な費用データと分析はCSVをエクスポートして確認できます。
                    </p>
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      予約データCSVをエクスポート
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-4">決済履歴</h3>
                  
                  {bookings.filter(b => b.payment_intent_id).length === 0 ? (
                    <div className="text-center py-6 text-gray-500 dark:text-dark-text-secondary">
                      決済データがありません
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                              日時
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                              ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                              掲載枠
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                              金額
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                              状態
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
                          {bookings
                            .filter(b => b.payment_intent_id)
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((booking) => (
                              <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-text-secondary">
                                {formatDate(booking.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs text-gray-900 dark:text-dark-text-primary">
                                  {booking.payment_intent_id?.substring(0, 12)}...
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-dark-text-primary">{booking.slot?.name || "不明"}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                                  ¥{booking.amount_paid?.toLocaleString() || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(booking.status)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            // 掲載効果分析タブの内容：AnalyticsDashboardコンポーネントを表示
            <AnalyticsDashboard />
          )}
        </div>
      )}
    </div>

    {/* 掲載枠作成モーダル */}
    <CreateSlotModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onSuccess={handleSlotSuccess}
    />

    {/* 掲載枠編集モーダル */}
    {selectedSlot && (
      <EditSlotModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleSlotSuccess}
        slot={selectedSlot}
      />
    )}

    {/* 動画掲載予約モーダル */}
    {showBookingModal && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center sticky top-0 bg-white dark:bg-dark-surface z-10">
            <h2 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">動画掲載予約</h2>
            <button 
              onClick={() => setShowBookingModal(false)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
          <div className="p-4">
            <BookingForm 
              onSuccess={handleBookingSuccess}
              onCancel={() => setShowBookingModal(false)}
            />
          </div>
        </div>
      </div>
    )}

    {/* キャンセル確認モーダル */}
    <CancelBookingModal
      isOpen={cancelModalOpen}
      booking={selectedBooking}
      onClose={handleCloseCancelModal}
      onConfirm={handleConfirmCancel}
    />
  </div>
);
}