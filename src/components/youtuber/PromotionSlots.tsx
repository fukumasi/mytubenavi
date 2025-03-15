import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../ui/LoadingSpinner';
import StripePaymentProvider from './payment/StripePaymentProvider';
import { useStripeContext } from '../../contexts/StripeContext';
import YouTubeThumbnail from './YouTubeThumbnail';

// YouTubeのIDを抽出する関数
const extractYouTubeId = (url: string): string | null => {
 const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
 const match = url.match(regExp);
 return (match && match[2].length === 11) ? match[2] : null;
};

// PromotionSlot型の定義を修正 - 実際のDBスキーマに合わせる
interface PromotionSlot {
 id: string;
 name: string;
 description: string;
 type: string; // positionではなくtypeを使用
 price: number;
 max_videos: number; // available_countではなくmax_videosを使用
 youtube_id?: string;
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

export default function PromotionSlots() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const { paymentSuccess, resetPaymentState } = useStripeContext();
 const [slots, setSlots] = useState<PromotionSlot[]>([]);
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
 // データの更新を強制するための状態
 const [refreshTrigger, setRefreshTrigger] = useState(0);

 // データを再フェッチする関数 - useCallbackでメモ化
 const fetchSlots = useCallback(async () => {
   if (!user) return;
   
   try {
     setLoading(true);
     console.log('掲載枠データを取得しています...');
     
     const { data, error: fetchError } = await supabase
       .from('promotion_slots')
       .select('*');
     
     if (fetchError) throw fetchError;
     
     console.log("取得した掲載枠データ:", data);
     
     // YouTube IDの表示
     if (data) {
       data.forEach(slot => {
         if (slot.youtube_id) {
           console.log(`掲載枠「${slot.name}」のYouTube ID: ${slot.youtube_id}`);
         }
       });
     }
     
     setSlots(data || []);
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
   const channel = supabase
     .channel('custom-promotion-slots-channel')
     .on('postgres_changes', 
       { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'promotion_slots' 
       }, 
       payload => {
         console.log('Supabase更新イベント受信:', payload);
         // データの更新が検出されたら再フェッチする
         fetchSlots();
       }
     )
     .subscribe((status) => {
       console.log('Supabaseチャンネルステータス:', status);
     });

   return () => {
     // クリーンアップ時にチャンネルを解除
     channel.unsubscribe();
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

 const calculateBookingPrice = () => {
   if (!selectedSlot || !bookingData.startDate || !bookingData.endDate) return 0;
   
   const start = new Date(bookingData.startDate);
   const end = new Date(bookingData.endDate);
   const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
   
   if (days <= 0) return 0;
   
   const slot = slots.find(s => s.id === selectedSlot);
   
   if (!slot) return 0;
   
   // slotのtypeを使用してPRICE_PER_DAYから価格を取得
   return days * (slot.price || PRICE_PER_DAY[slot.type as keyof typeof PRICE_PER_DAY] || 0);
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
       <button 
         onClick={handleManualRefresh}
         className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
       >
         データを更新する
       </button>
     </div>
       
       <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
         <div className="flex">
           <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
           <div>
             <h3 className="text-sm font-medium text-yellow-800">掲載に関する注意事項</h3>
             <div className="mt-2 text-sm text-yellow-700">
               <ul className="list-disc pl-5 space-y-1">
                 <li>掲載期間は最短1日から最長30日まで選択可能です</li>
                 <li>掲載内容は当サイトのガイドラインに準拠する必要があります</li>
                 <li>掲載料金は前払いとなります</li>
                 <li>空き状況は予告なく変更される場合があります</li>
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
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                 残り{slot.max_videos}枠
               </span>
             </div>
             
             {/* サムネイル表示 - 新しいコンポーネントを使用 */}
             {slot.youtube_id && (
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   サムネイル ({slot.youtube_id})
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
       </div>
     </div>

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
                     サムネイルプレビュー ({youtubePreviewId})
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