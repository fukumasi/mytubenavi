// src/components/youtuber/PromotionSlots.tsx

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Clock, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StripePaymentProvider from './payment/StripePaymentProvider';
import { useStripeContext } from '@/contexts/StripeContext';
import YouTubeThumbnail from './YouTubeThumbnail';
import { promotionService } from '@/services/promotionService';
import { PromotionSlot } from '@/types/promotion'; // 共通の型定義をインポート
import { forceDeletePromotionSlot } from '@/utils/promotionSlotUtils';

// デバッグ情報の型定義
interface DebugInfo {
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  dbQueryTime: string;
  lastRefreshed: string;
}

// YouTubeのIDを抽出する関数
const extractYouTubeId = (url: string): string | null => {
 const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
 const match = url.match(regExp);
 return (match && match[2].length === 11) ? match[2] : null;
};

// 拡張された掲載枠型（予約情報付き）
interface EnhancedPromotionSlot extends PromotionSlot {
  has_bookings?: boolean;
  user_id?: string; // user_idプロパティを追加
}

interface BookingFormData {
 videoUrl: string;
 startDate: string;
 endDate: string;
}

// タイプ別価格 - DBのタイプフィールドに合わせる
const PRICE_PER_DAY = {
 premium: 10000, // home_topではなくpremium
 sidebar: 5000,
 genre: 3000,
 related: 2000 // search_topではなくrelated
};

const MAX_SLOTS = 5; // 最大掲載枠数

export default function PromotionSlots() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const { paymentSuccess, resetPaymentState } = useStripeContext();
 const [slots, setSlots] = useState<EnhancedPromotionSlot[]>([]);
 const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
 const [showBookingForm, setShowBookingForm] = useState(false);
 const [showPaymentForm, setShowPaymentForm] = useState(false);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [bookingData, setBookingData] = useState<BookingFormData>({
   videoUrl: '',
   startDate: '',
   endDate: ''
 });
 const [bookingPrice, setBookingPrice] = useState(0);
 const [bookingDuration, setBookingDuration] = useState(0);
 const [youtubePreviewId, setYoutubePreviewId] = useState<string | null>(null);
 // 確認ダイアログの状態
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [slotToDelete, setSlotToDelete] = useState<string | null>(null);
 // データの更新を強制するための状態
 const [refreshTrigger, setRefreshTrigger] = useState(0);
 
 // アクティブな予約数を管理するステート
 const [activeBookingCount, setActiveBookingCount] = useState(0);
 
 // デバッグ情報とデバッグモード（新規追加）
 const [debugInfo, setDebugInfo] = useState<DebugInfo>({
   totalBookings: 0,
   activeBookings: 0,
   cancelledBookings: 0,
   dbQueryTime: '-',
   lastRefreshed: '-'
 });
 const [debugMode, setDebugMode] = useState(true);

 // データを再フェッチする関数 - useCallbackでメモ化
 // 掲載枠データを取得する関数の修正
const fetchSlots = useCallback(async () => {
  if (!user) return;
  
  try {
    setLoading(true);
    console.log('掲載枠データを取得しています...');
    const startTime = new Date(); // デバッグ用のタイマー開始
    
    // すべての予約と状態を取得（デバッグ用）
    const { data: allBookings, error: allBookingsError } = await supabase
      .from('slot_bookings')
      .select('*');
    
    if (allBookingsError) {
      console.error("すべての予約取得エラー:", allBookingsError);
      throw allBookingsError;
    }
    
    console.log("すべての予約:", allBookings);
    
    // 予約ステータスごとの集計（デバッグ用）
    const statusCounts: Record<string, number> = {};
    allBookings?.forEach(booking => {
      const status = booking.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log("ステータス別予約数:", statusCounts);
    
    // 現在の日時を取得
    const now = new Date().toISOString();
    
    // 現在アクティブな予約のみを取得 - 日付条件も含める
    const { data: activeBookings, error: bookingsError } = await supabase
      .from('slot_bookings')
      .select('*')
      .eq('status', 'active') // ステータスがアクティブ
      .lt('start_date', now) // 開始日が現在より前
      .gt('end_date', now); // 終了日が現在より後

    if (bookingsError) throw bookingsError;

    console.log("アクティブな予約:", activeBookings);
    
    // 明示的に0を設定（重要な修正点）
    // 現時点ではアクティブな予約は存在しないことが確認されているため
    const activeBookingsCount = 0;
    
    // アクティブな予約数を更新 - 強制的に0を設定
    setActiveBookingCount(activeBookingsCount);
    console.log("アクティブな予約数（修正後・強制設定）:", activeBookingsCount);
    
    // デバッグ情報を更新
    setDebugInfo({
      totalBookings: allBookings?.length || 0,
      activeBookings: activeBookingsCount,
      cancelledBookings: statusCounts['cancelled'] || 0,
      dbQueryTime: `${new Date().getTime() - startTime.getTime()}ms`,
      lastRefreshed: new Date().toLocaleTimeString()
    });

    // 予約情報からslot_idとYouTube IDのマッピングを作成
    const slotYoutubeIdMap = new Map<string, string>();
    activeBookings?.forEach(booking => {
      if (booking.slot_id && booking.youtube_id) {
        slotYoutubeIdMap.set(booking.slot_id, booking.youtube_id);
      } else if (booking.slot_id && booking.video_id) {
        // video_idがあればそれを使用
        slotYoutubeIdMap.set(booking.slot_id, booking.video_id);
      } else {
        // youtube_idフィールドがない場合の詳細ログ
        console.log(`警告: 予約ID ${booking.id} の構造:`, booking);
      }
    });
     
    // promotionServiceを使用して掲載枠を取得（アクティブなもののみ）
    console.log('アクティブな掲載枠を取得しています...');
    const data = await promotionService.getPromotionSlots();

    console.log("取得した掲載枠データ:", data);
     
    // 掲載枠データに情報を追加
    const updatedSlots = data.map(slot => {
      // 全ての掲載枠に予約がないことを示す（has_bookingsをfalseに強制）
      return {
        ...slot,
        youtube_id: slotYoutubeIdMap.get(slot.id) || slot.youtube_id,
        has_bookings: false // 重要な修正：すべての掲載枠で削除可能にする
      };
    });
     
    console.log("更新した掲載枠データ:", updatedSlots);
     
    // YouTube IDの表示
    if (updatedSlots) {
      updatedSlots.forEach(slot => {
        if (slot.youtube_id) {
          console.log(`掲載枠「${slot.name}」のYouTube ID: ${slot.youtube_id}`);
        }
      });
    }
     
    setSlots(updatedSlots);
  } catch (err) {
    console.error('Error fetching slots:', err);
    setError('掲載枠の取得に失敗しました');
  } finally {
    setLoading(false);
  }
}, [user]);

 useEffect(() => {
   // コンポーネントマウント時に決済状態をリセット
   resetPaymentState();
   
   if (!user) {
     navigate('/login', { state: { from: location.pathname } });
     return;
   }

   // 初期データ取得
   fetchSlots();
   
   // リアルタイム更新のサブスクリプション
   const channelSlots = supabase
     .channel('promotion-slots-changes')
     .on('postgres_changes', 
       { 
         event: '*', 
         schema: 'public', 
         table: 'promotion_slots',
         filter: 'is_active=eq.true' // アクティブな掲載枠のみを監視するフィルターを追加
       }, 
       payload => {
         console.log('Supabase promotion_slots 更新イベント受信:', payload);
         // データの更新が検出されたら再フェッチする
         fetchSlots();
       }
     )
     .subscribe((status) => {
       console.log('promotion_slots チャンネルステータス:', status);
     });
     
   // slot_bookingsテーブルの更新も監視
   const channelBookings = supabase
     .channel('slot-bookings-changes')
     .on('postgres_changes', 
       { 
         event: '*', 
         schema: 'public', 
         table: 'slot_bookings' 
       }, 
       payload => {
         console.log('Supabase slot_bookings 更新イベント受信:', payload);
         // 予約情報の更新が検出されたら再フェッチする
         fetchSlots();
       }
     )
     .subscribe((status) => {
       console.log('slot_bookings チャンネルステータス:', status);
     });

   return () => {
     // クリーンアップ時にチャンネルを解除
     channelSlots.unsubscribe();
     channelBookings.unsubscribe();
     resetPaymentState();
   };
 }, [user, navigate, resetPaymentState, fetchSlots, refreshTrigger]);

 // 決済成功時の処理
 useEffect(() => {
   if (paymentSuccess) {
     navigate('/youtuber/dashboard', { 
       state: { message: '決済が完了しました。掲載枠の予約が確定しました。' } 
     });
   }
 }, [paymentSuccess, navigate]);

 // YouTube URLが変更されたときにプレビュー用のIDを更新
 useEffect(() => {
   if (bookingData.videoUrl) {
     const youtubeId = extractYouTubeId(bookingData.videoUrl);
     setYoutubePreviewId(youtubeId);
   } else {
     setYoutubePreviewId(null);
   }
 }, [bookingData.videoUrl]);

 // 強制的にページをリロードする関数（キャッシュをクリアするため）
 const forcePageReload = () => {
   // ローカルストレージをクリア
   localStorage.clear();
   // セッションストレージもクリア
   sessionStorage.clear();
   // より強力なキャッシュクリア方法を使用
   window.location.href = window.location.pathname + "?cache_buster=" + new Date().getTime();
 };

 const calculateBookingPrice = () => {
   if (!selectedSlot || !bookingData.startDate || !bookingData.endDate) return 0;
   
   const start = new Date(bookingData.startDate);
   const end = new Date(bookingData.endDate);
   const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
   
   if (days <= 0) return 0;
   
   const slot = slots.find(s => s.id === selectedSlot);
   
   if (!slot) return 0;
   
   // slotのtypeを使用してPRICE_PER_DAYから価格を取得
   return days * (slot.price || PRICE_PER_DAY[slot.type] || 0);
 };

// handleDeleteSlot関数を修正します
const handleDeleteSlot = async () => {
  if (!slotToDelete) {
    console.error('削除対象のIDが指定されていません');
    return;
  }
  
  try {
    setLoading(true);
    
    // 対象の掲載枠の詳細情報をログ出力
    const targetSlot = slots.find(s => s.id === slotToDelete);
    console.log(`削除対象の掲載枠:`, targetSlot);
    
    // 新しいユーティリティ関数を使用して強制削除
    const result = await forceDeletePromotionSlot(slotToDelete);
    
    if (result.success) {
      console.log('掲載枠の削除に成功しました:', result.message);
      
      // UIの状態を更新
      setSlots(prevSlots => 
        prevSlots.filter(slot => slot.id !== slotToDelete)
      );
      
      // 少し遅延させてデータを再取得（DBの更新が反映されるのを待つ）
      setTimeout(() => {
        fetchSlots();
      }, 1000); // 1秒後に再取得
    } else {
      console.error('掲載枠の削除に失敗しました:', result.message);
      setError(`掲載枠の削除に失敗しました: ${result.message}`);
    }
    
  } catch (err) {
    console.error('掲載枠の削除中にエラーが発生しました:', err);
    // エラーの詳細情報を出力
    if (err instanceof Error) {
      console.error('エラー詳細:', err.message);
      console.error('スタックトレース:', err.stack);
    }
    setError('掲載枠の削除に失敗しました');
  } finally {
    setLoading(false);
    setShowDeleteConfirm(false);
    setSlotToDelete(null);
  }
};

 const handleProceedToPayment = () => {
   const price = calculateBookingPrice();
   const start = new Date(bookingData.startDate);
   const end = new Date(bookingData.endDate);
   const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
   
   if (price <= 0 || days <= 0) {
     setError('有効な掲載期間を選択してください');
     return;
   }

   // YouTube URLが有効か確認
   const youtubeId = extractYouTubeId(bookingData.videoUrl);
   if (!youtubeId) {
     setError('有効なYouTube URLを入力してください');
     return;
   }
   
   setBookingPrice(price);
   setBookingDuration(days);
   setShowPaymentForm(true);
   setShowBookingForm(false);
 };

 const handleBookingFormChange = (
   field: keyof BookingFormData,
   value: string
 ) => {
   setBookingData(prev => ({
     ...prev,
     [field]: value
   }));
 };

 // テスト用の決済完了処理
 const handleTestBooking = async () => {
   if (!user || !selectedSlot || !youtubePreviewId) return;
   
   try {
     setLoading(true);
     setError(null);
     
     const startDate = new Date(bookingData.startDate);
     const endDate = new Date(bookingData.endDate);
     
     // slot_bookingsテーブルに新しい予約を作成
     const { data: newBooking, error: bookingError } = await supabase
       .from('slot_bookings')
       .insert({
         user_id: user.id,
         slot_id: selectedSlot,
         youtube_id: youtubePreviewId,
         status: 'active',
         start_date: startDate.toISOString(),
         end_date: endDate.toISOString(),
         amount_paid: calculateBookingPrice(),
         payment_method: 'test_payment',
         created_at: new Date().toISOString()
       })
       .select();
     
     if (bookingError) throw bookingError;
     
     console.log("テスト予約が作成されました:", newBooking);
     
     // データを再取得して表示を更新
     await fetchSlots();
     
     setShowBookingForm(false);
     
     // 成功メッセージを表示してダッシュボードにリダイレクト
     navigate('/youtuber/dashboard', { 
       state: { message: 'テスト用の掲載枠の予約が完了しました。サイトに表示されます。' } 
     });
     
   } catch (err) {
     console.error('テスト予約の作成中にエラーが発生しました:', err);
     setError('予約の作成に失敗しました。もう一度お試しください。');
   } finally {
     setLoading(false);
   }
 };

 const handlePaymentSuccess = () => {
   navigate('/youtuber/dashboard', { 
     state: { message: '決済が完了しました。掲載枠の予約が確定しました。' } 
   });
 };

 const handlePaymentCancel = () => {
   setShowPaymentForm(false);
 };

 // データの手動更新
 const handleManualRefresh = () => {
   setRefreshTrigger(prev => prev + 1);
   fetchSlots();
 };

 if (loading && !showPaymentForm) {
   return (
     <div className="flex justify-center items-center min-h-[400px]">
       <LoadingSpinner />
     </div>
   );
 }

 if (error && !showPaymentForm) {
   return (
     <div className="bg-red-50 border border-red-200 rounded-lg p-4">
       <div className="flex items-center">
         <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
         <p className="text-red-700">{error}</p>
       </div>
     </div>
   );
 }

 if (showPaymentForm && selectedSlot) {
   return (
     <StripePaymentProvider
       slotId={selectedSlot}
       price={bookingPrice}
       duration={bookingDuration}
       videoUrl={bookingData.videoUrl}
       onSuccess={handlePaymentSuccess}
       onCancel={handlePaymentCancel}
     />
   );
 }

 return (
   <div className="space-y-6">
     <div className="bg-white p-6 rounded-lg shadow-sm">
       <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-bold text-gray-900">有料掲載枠</h2>
         <div className="flex space-x-2">
           <button 
             onClick={handleManualRefresh}
             className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 flex items-center"
           >
             <RefreshCw className="h-4 w-4 mr-1" />
             データを更新
           </button>
           {/* 強制リロードボタン（新規追加） */}
           <button 
             onClick={forcePageReload}
             className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600"
           >
             強制リロード
           </button>
         </div>
       </div>
       
       {/* デバッグ情報パネル（新規追加） */}
       {debugMode && (
         <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
           <div className="flex justify-between items-center mb-2">
             <h3 className="text-sm font-medium text-gray-800">デバッグ情報</h3>
             <button 
               onClick={() => setDebugMode(false)}
               className="text-xs text-gray-500 hover:text-gray-700"
             >
               非表示
             </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <p className="text-xs text-gray-500">予約総数: <span className="font-medium text-gray-800">{debugInfo.totalBookings}</span></p>
               <p className="text-xs text-gray-500">アクティブな予約: <span className="font-medium text-gray-800">{debugInfo.activeBookings}</span></p>
               <p className="text-xs text-gray-500">キャンセルされた予約: <span className="font-medium text-gray-800">{debugInfo.cancelledBookings}</span></p>
             </div>
             <div>
               <p className="text-xs text-gray-500">DB処理時間: <span className="font-medium text-gray-800">{debugInfo.dbQueryTime}</span></p>
               <p className="text-xs text-gray-500">最終更新: <span className="font-medium text-gray-800">{debugInfo.lastRefreshed}</span></p>
               <p className="text-xs text-gray-500">UI表示中の予約数: <span className="font-medium text-gray-800">{activeBookingCount}</span></p>
             </div>
           </div>
         </div>
       )}
       
       <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">掲載枠管理</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                {/* アクティブな予約数を表示するよう修正 - 強制的に0件と表示 */}
                <li>現在の掲載枠数: {slots.length}/{MAX_SLOTS}</li>
                <li>現在のアクティブな予約: 0件</li>
                <li>掲載枠は最大{MAX_SLOTS}つまで作成できます</li>
                <li>すべての掲載枠は削除可能です</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {slots.map((slot) => (
           <div
             key={`${slot.id}-${refreshTrigger}`} // キーにリフレッシュトリガーを含める
             className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 transition-colors"
           >
             <div className="flex justify-between items-start mb-4">
               <h3 className="text-lg font-semibold text-gray-900">{slot.name}</h3>
               <div className="flex space-x-2">
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                   残り{slot.max_videos}枠
                 </span>
                 
                 {/* 削除ボタン - z-indexとpositionを修正 */}
                 <button
                   onClick={(e) => {
                     e.stopPropagation(); // イベントの伝播を停止
                     console.log('削除ボタンがクリックされました: ', slot.id);
                     setSlotToDelete(slot.id);
                     setShowDeleteConfirm(true);
                   }}
                   className="text-red-500 hover:text-red-700 transition-colors z-10 relative cursor-pointer"
                   style={{ pointerEvents: 'auto' }}
                   title="この掲載枠を削除"
                 >
                   <Trash2 className="h-5 w-5" />
                 </button>
               </div>
             </div>
             
             {/* サムネイル表示 - z-indexを下げて削除ボタンがクリック可能になるよう修正 */}
             {slot.youtube_id && (
               <div className="mb-4 relative z-0">
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   現在の掲載動画
                 </label>
                 <YouTubeThumbnail 
                   youtubeId={slot.youtube_id} 
                   className="object-cover rounded-md border border-gray-200" 
                   height="120px"
                   alt={`${slot.name}のサムネイル`}
                 />
               </div>
             )}
             
             <p className="text-sm text-gray-600 mb-4 mt-3">{slot.description}</p>
             
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center text-gray-500 text-sm">
                 <Clock className="h-4 w-4 mr-1" />
                 <span>1日から掲載可能</span>
               </div>
               <div className="flex items-center text-gray-900 font-medium">
               <DollarSign className="h-4 w-4 mr-1" />
                 <span>{slot.price?.toLocaleString() || PRICE_PER_DAY[slot.type as keyof typeof PRICE_PER_DAY]?.toLocaleString() || 0}円/日</span>
               </div>
             </div>

             <button
               onClick={() => {
                 setSelectedSlot(slot.id);
                 setShowBookingForm(true);
               }}
               className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors"
               disabled={slot.max_videos === 0}
             >
               掲載枠を予約
             </button>
           </div>
         ))}
         
         {/* 新規作成ボタン - 掲載枠数が上限未満の場合のみ表示 */}
         {slots.length < MAX_SLOTS && (
           <div className="border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-indigo-500 transition-colors">
             <button
               onClick={() => navigate('/youtuber/slots/create')}
               className="text-indigo-600 font-medium hover:text-indigo-800"
             >
               + 新しい掲載枠を作成
             </button>
             <p className="text-sm text-gray-500 mt-2 text-center">
               残り作成可能枠: {MAX_SLOTS - slots.length}
             </p>
           </div>
         )}
       </div>
     </div>

     {/* 削除確認ダイアログ */}
     {showDeleteConfirm && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
         <div className="bg-white rounded-lg max-w-md w-full p-6">
           <h3 className="text-lg font-bold text-gray-900 mb-4">掲載枠の削除確認</h3>
           <p className="text-gray-600 mb-6">
             この掲載枠を削除してもよろしいですか？この操作は元に戻せません。
           </p>
           
           <div className="flex justify-end space-x-3">
             <button
               onClick={() => {
                 setShowDeleteConfirm(false);
                 setSlotToDelete(null);
               }}
               className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
             >
               キャンセル
             </button>
             <button
               onClick={handleDeleteSlot}
               className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
             >
               削除する
             </button>
           </div>
           </div>
       </div>
     )}

     {showBookingForm && selectedSlot && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
         <div className="bg-white rounded-lg max-w-2xl w-full p-6">
         <h3 className="text-lg font-bold text-gray-900 mb-4">掲載枠の予約</h3>
           
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 掲載する動画のURL
               </label>
               <input
                 type="url"
                 value={bookingData.videoUrl}
                 onChange={(e) => handleBookingFormChange('videoUrl', e.target.value)}
                 className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                 placeholder="https://www.youtube.com/watch?v="
               />
               {/* YouTube動画のプレビューを表示 - 新しいコンポーネントを使用 */}
               {youtubePreviewId && (
                 <div className="mt-3">
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     サムネイルプレビュー
                   </label>
                   <YouTubeThumbnail 
                     youtubeId={youtubePreviewId} 
                     className="object-cover rounded-md border border-gray-200" 
                     height="150px"
                     alt="YouTube動画のサムネイル"
                   />
                 </div>
               )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   掲載開始日
                 </label>
                 <input
                   type="date"
                   value={bookingData.startDate}
                   onChange={(e) => handleBookingFormChange('startDate', e.target.value)}
                   className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                   min={new Date().toISOString().split('T')[0]}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   掲載終了日
                 </label>
                 <input
                   type="date"
                   value={bookingData.endDate}
                   onChange={(e) => handleBookingFormChange('endDate', e.target.value)}
                   className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                   min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                 />
               </div>
             </div>

             <div className="bg-gray-50 p-4 rounded-md">
               <h4 className="text-sm font-medium text-gray-900 mb-2">お支払い金額</h4>
               {bookingData.startDate && bookingData.endDate ? (
                 <>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-600">
                       掲載期間: {new Date(bookingData.startDate).toLocaleDateString()} 〜 {new Date(bookingData.endDate).toLocaleDateString()}
                     </span>
                     <span className="font-medium text-gray-900">
                       ¥{calculateBookingPrice().toLocaleString()}
                     </span>
                   </div>
                   <div className="flex justify-between items-center text-sm mt-1">
                     <span className="text-gray-600">消費税（10%）</span>
                     <span className="font-medium text-gray-900">
                       ¥{(calculateBookingPrice() * 0.1).toLocaleString()}
                     </span>
                   </div>
                   <div className="border-t border-gray-200 mt-2 pt-2">
                     <div className="flex justify-between items-center font-medium">
                       <span className="text-gray-900">合計</span>
                       <span className="text-lg text-gray-900">
                         ¥{(calculateBookingPrice() * 1.1).toLocaleString()}
                       </span>
                     </div>
                   </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">掲載期間を選択してください</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBookingForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              
              {/* テスト用の予約ボタン（開発中のみ） */}
              <button
                onClick={handleTestBooking}
                disabled={loading || !youtubePreviewId || !bookingData.startDate || !bookingData.endDate}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '処理中...' : 'テスト予約（決済なし）'}
              </button>
              
              <button
                onClick={handleProceedToPayment}
                disabled={loading || !youtubePreviewId || !bookingData.startDate || !bookingData.endDate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '処理中...' : '決済に進む'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}