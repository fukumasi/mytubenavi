// src/components/home/PromotedVideos.tsx
import { useEffect, useState } from 'react';
import { promotionService } from '@/services/promotionService';
import { Video } from '@/types/video';
import { SlotBooking } from '@/types/promotion';
import PromotionCard from '@/components/shared/PromotionCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PromotedVideosProps {
  limit?: number;
  className?: string;
  title?: string;
  showIfEmpty?: boolean;
}

type PromotedVideo = {
  video: Video;
  booking: SlotBooking;
};

const PromotedVideos = ({
  limit = 4,
  className = "",
  title = "おすすめ動画",
  showIfEmpty = false,
}: PromotedVideosProps) => {
  const [promotedVideos, setPromotedVideos] = useState<PromotedVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchPromotedVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('掲載動画を取得しています...');
        // 更新したpromotionServiceを使用
        const bookings = await promotionService.getAllActiveBookings();
        
        console.log(`取得した予約数: ${bookings.length}`, bookings);

        if (!bookings || bookings.length === 0) {
          console.log('アクティブな予約がありません');
          setPromotedVideos([]);
          setLoading(false);
          return;
        }

        // 動画情報が取得済みかチェック
        const videosWithData = bookings.filter(booking => booking.video);
        console.log(`動画情報が含まれている予約: ${videosWithData.length}`);
        
        if (videosWithData.length === 0) {
          console.log('動画情報を含む予約がありません');
          setPromotedVideos([]);
          setLoading(false);
          return;
        }

        // 動画と予約データをマージ
        const mergedData = videosWithData
          .map(booking => {
            return booking.video ? { 
              video: booking.video, 
              booking 
            } : null;
          })
          .filter(Boolean) as PromotedVideo[];

        console.log(`マージされたデータ: ${mergedData.length}件`, mergedData);

        // 重複チェック - 同じ動画が複数回表示されないようにする
        const uniqueVideos = mergedData.reduce((acc: PromotedVideo[], current) => {
          const isDuplicate = acc.some(item => item.video.id === current.video.id);
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        }, []);

        // 表示数を制限
        const limitedVideos = uniqueVideos.slice(0, limit);
        console.log(`表示する掲載動画: ${limitedVideos.length}件`);
        
        setPromotedVideos(limitedVideos);
      } catch (err: any) {
        console.error('掲載動画の取得に失敗しました:', err);
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
  }, [retryCount, limit]);

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
        <button 
          onClick={() => setRetryCount(prev => prev + 1)}
          className="mt-2 text-xs bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1 rounded transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  if (promotedVideos.length === 0 && !showIfEmpty) {
    return null; // 表示するプロモーション動画がなく、空表示フラグがfalseの場合は何も表示しない
  }

  return (
    <div className={`mb-8 bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border border-blue-100 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-900">{title}</h2>
        <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">スポンサード</span>
      </div>
      
      {promotedVideos.length > 0 ? (
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
      ) : (
        <div className="text-center p-8 bg-white rounded border border-blue-50 text-blue-400">
          現在表示できるスポンサー動画はありません
        </div>
      )}
    </div>
  );
};

export default PromotedVideos;