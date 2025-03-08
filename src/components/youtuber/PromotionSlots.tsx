// src/components/youtuber/PromotionSlots.tsx

import { useState, useEffect } from 'react';
import { DollarSign, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../ui/LoadingSpinner';

// PromotionSlot型の定義を修正
interface PromotionSlot {
  id: string;
  name: string;
  description: string;
  position: string; // positionプロパティを追加
  type: string;
  available_count: number; // available_countプロパティを追加
  status: string;
}

interface BookingFormData {
  videoUrl: string;
  startDate: string;
  endDate: string;
}

const PRICE_PER_DAY = {
  home_top: 10000,
  home_side: 5000,
  genre_top: 3000,
  search_top: 2000
};

export default function PromotionSlots() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slots, setSlots] = useState<PromotionSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<BookingFormData>({
    videoUrl: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('promotion_slots')
          .select('*')
          .eq('status', 'available');

        if (fetchError) throw fetchError;
        setSlots(data || []);
      } catch (err) {
        console.error('Error fetching slots:', err);
        setError('掲載枠の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();

    const subscription = supabase
      .channel('promotion_slots_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'promotion_slots' 
      }, (payload) => {
        setSlots(currentSlots => {
          const updatedSlot = payload.new as PromotionSlot;
          return currentSlots.map(slot => 
            slot.id === updatedSlot.id ? updatedSlot : slot
          );
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  const calculateBookingPrice = () => {
    if (!selectedSlot || !bookingData.startDate || !bookingData.endDate) return 0;
    
    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const slot = slots.find(s => s.id === selectedSlot);
    
    return days * (PRICE_PER_DAY[slot?.position as keyof typeof PRICE_PER_DAY] || 0);
  };

  const handleBookSlot = async () => {
    if (!user || !selectedSlot) return;

    try {
      setLoading(true);
      const price = calculateBookingPrice();
      
      const { error: bookingError } = await supabase
        .from('slot_bookings')
        .insert([{
          slot_id: selectedSlot,
          user_id: user.id, // user.uidをuser.idに変更
          video_url: bookingData.videoUrl,
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          price: price,
          tax: price * 0.1,
          total_amount: price * 1.1,
          status: 'pending'
        }]);

      if (bookingError) throw bookingError;
      
      // 成功後、予約完了ページまたはダッシュボードへリダイレクト
      navigate('/youtuber/dashboard', { 
        state: { message: '掲載枠の予約が完了しました。審査後に掲載が開始されます。' } 
      });
    } catch (err) {
      console.error('Error booking slot:', err);
      setError('予約に失敗しました');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">有料掲載枠</h2>
        
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
              key={slot.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-indigo-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{slot.name}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  残り{slot.available_count}枠
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{slot.description}</p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>1日から掲載可能</span>
                </div>
                <div className="flex items-center text-gray-900 font-medium">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>{PRICE_PER_DAY[slot.position as keyof typeof PRICE_PER_DAY].toLocaleString()}円/日</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedSlot(slot.id);
                  setShowBookingForm(true);
                }}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                disabled={slot.available_count === 0}
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
                  onClick={handleBookSlot}
                  disabled={loading || !bookingData.videoUrl || !bookingData.startDate || !bookingData.endDate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? '処理中...' : '予約を確定'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}