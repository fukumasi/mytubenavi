// src/components/home/PromotedVideos.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Video } from '@/types/video';
import { SlotBooking } from '@/types/promotion';
import PromotionCard from '@/components/shared/PromotionCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type PromotedVideo = {
  video: Video;
  booking: SlotBooking;
};

const PromotedVideos = () => {
  const [promotedVideos, setPromotedVideos] = useState<PromotedVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchPromotedVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 現在アクティブな予約を取得
        const now = new Date().toISOString();
        const { data: bookings, error: bookingError } = await supabase
          .from('slot_bookings')
          .select('*, promotion_slots(id, name, type, price)')
          .eq('status', 'active')
          .lt('start_date', now)
          .gt('end_date', now)
          .order('price', { ascending: false, foreignTable: 'promotion_slots' })
          .limit(4);

        if (bookingError) throw bookingError;

        if (!bookings || bookings.length === 0) {
          setPromotedVideos([]);
          setLoading(false);
          return;
        }

        // 予約に関連する動画を取得
        const videoIds = bookings
          .filter(booking => booking.video_id)
          .map(booking => booking.video_id);
          
        if (videoIds.length === 0) {
          setPromotedVideos([]);
          setLoading(false);
          return;
        }

        const { data: videos, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .in('id', videoIds);

        if (videoError) throw videoError;

        // 動画と予約データをマージ
        const mergedData = bookings
          .map(booking => {
            const video = videos?.find(v => v.id === booking.video_id);
            return video ? { video, booking } : null;
          })
          .filter(Boolean) as PromotedVideo[];

        // 重複チェック - 同じ動画が複数回表示されないようにする
        const uniqueVideos = mergedData.reduce((acc: PromotedVideo[], current) => {
          const isDuplicate = acc.some(item => item.video.id === current.video.id);
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        }, []);

        setPromotedVideos(uniqueVideos);
      } catch (err: any) {
        console.error('Failed to fetch promoted videos:', err);
        setError(`プロモーション動画の読み込みに失敗しました: ${err.message || 'Unknown error'}`);
        
        // 最大3回までリトライ
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * (retryCount + 1)); // 指数バックオフ: 1秒、2秒、3秒
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPromotedVideos();
  }, [retryCount]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-100 mb-6">
        <p className="font-medium">エラーが発生しました</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (promotedVideos.length === 0) {
    return null; // 表示するプロモーション動画がない場合は何も表示しない
  }

  return (
    <div className="mb-8 bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border border-blue-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-900">おすすめ動画</h2>
        <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">スポンサード</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {promotedVideos.map((item) => (
          <PromotionCard
            key={item.booking.id}
            bookingId={item.booking.id}
            videoId={item.video.id}
            youtubeId={item.video.youtube_id}
            title={item.video.title}
            channelName={item.video.channel_title}
            thumbnailUrl={item.video.thumbnail}
            position="featured"
            promoted={true}
            duration={item.video.duration}
            viewCount={item.video.view_count}
            description={item.video.description?.substring(0, 120)}
          />
        ))}
      </div>
    </div>
  );
};

export default PromotedVideos;