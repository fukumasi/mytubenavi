// src/components/youtuber/ActivePromotions.tsx

import { useState, useEffect } from 'react';
import { Eye, Clock, ExternalLink, AlertTriangle, BarChart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../ui/LoadingSpinner';

interface Promotion {
  id: string;
  title: string;
  thumbnail: string;
  slotType: string;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  videoId: string;
  status: 'active' | 'scheduled' | 'ended';
  price?: number;
  ctr?: number;
}

interface RawSlotBooking {
  id: string;
  video_id: string;
  promotion_slots: {
    type: string;
    name: string;
  }[];
  videos: {
    title: string;
    thumbnail: string;
  }[];
  start_date: string;
  end_date: string;
  impressions: number;
  clicks: number;
  status: 'active' | 'scheduled' | 'ended';
  youtuber_id: string;
}

interface ActivePromotionsProps {
  promotions?: Promotion[]; // オプショナルに変更
}

export default function ActivePromotions({ promotions: initialPromotions = [] }: ActivePromotionsProps) {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('slot_bookings')
          .select(`
            id,
            video_id,
            promotion_slots (
              type,
              name
            ),
            videos (
              title,
              thumbnail
            ),
            start_date,
            end_date,
            impressions,
            clicks,
            status
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (fetchError) throw fetchError;

        const formattedPromotions: Promotion[] = (data as RawSlotBooking[]).map(booking => ({
          id: booking.id,
          title: booking.videos[0]?.title || '',
          thumbnail: booking.videos[0]?.thumbnail || '',
          slotType: booking.promotion_slots[0]?.name || '',
          startDate: new Date(booking.start_date).toLocaleDateString('ja-JP'),
          endDate: new Date(booking.end_date).toLocaleDateString('ja-JP'),
          impressions: booking.impressions || 0,
          clicks: booking.clicks || 0,
          videoId: booking.video_id,
          status: booking.status
        }));

        setPromotions(formattedPromotions);
      } catch (err) {
        console.error('Error fetching promotions:', err);
        setError('プロモーション情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    // 初期プロモーションが提供された場合はそれを使用し、そうでなければAPIから取得
    if (initialPromotions && initialPromotions.length > 0) {
      setPromotions(initialPromotions);
      setLoading(false);
    } else {
      fetchPromotions();
    }
  }, [user, initialPromotions]); // 依存配列を更新

  const handlePreview = (videoId: string) => {
    window.open(`/video/${videoId}`, '_blank');
  };

  const handleViewReport = (promoId: string) => {
    window.open(`/youtuber/promotions/${promoId}/report`, '_blank');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (loading && (!initialPromotions || initialPromotions.length === 0)) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            掲載中の動画
            <span className="ml-2 text-sm text-gray-500">
              ({promotions.length}件)
            </span>
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {promotions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              現在掲載中の動画はありません
            </div>
          ) : (
            promotions.map((promo) => (
              <div key={promo.id} className="p-6 flex items-start space-x-4">
                <div className="relative flex-shrink-0 w-48">
                  <img
                    src={promo.thumbnail || '/placeholder.jpg'}
                    alt={promo.title}
                    className="w-full h-27 object-cover rounded-lg"
                  />
                  <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full 
                    ${promo.status === 'active' ? 'bg-green-100 text-green-800' : 
                      promo.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {promo.status === 'active' ? '掲載中' : 
                     promo.status === 'scheduled' ? '掲載予定' : '掲載終了'}
                  </span>
                </div>

                <div className="flex-grow">
                  <h3 className="text-sm font-medium text-gray-900">{promo.title}</h3>
                  
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        {promo.startDate} 〜 {promo.endDate}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {promo.impressions.toLocaleString()} 回表示
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-3">
                    <button 
                      onClick={() => handlePreview(promo.videoId)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      プレビュー
                    </button>
                    <button 
                      onClick={() => handleViewReport(promo.id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <BarChart className="h-4 w-4 mr-1" />
                      詳細レポート
                    </button>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {promo.slotType}
                  </span>
                  <div className="mt-2 text-sm text-gray-500">
                    CTR: {promo.impressions > 0 
                      ? ((promo.clicks / promo.impressions) * 100).toFixed(2)
                      : promo.ctr ? promo.ctr.toFixed(2) : '0.00'}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}