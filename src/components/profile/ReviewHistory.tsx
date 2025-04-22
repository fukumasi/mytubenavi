import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';
import { supabase } from '@/lib/supabase';

// シンプルな拡張型を定義
interface ReviewItem {
  id: string;
  video_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at?: string;
  videoTitle: string;
}

// YouTube IDの妥当性チェック関数
const isValidYoutubeId = (id: string): boolean => {
  // YouTubeのIDは通常11文字の英数字
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
};

// サムネイルURLを取得する関数
const getThumbnailUrl = (videoId: string): string => {
  if (isValidYoutubeId(videoId)) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  // 無効なIDの場合はデフォルト画像を返す
  return '/placeholder.jpg';
};

const ReviewHistory = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('認証されていません');

        // video_ratingsテーブルからレビュー情報を取得
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('video_ratings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ratingsError) throw ratingsError;
        if (!ratingsData || ratingsData.length === 0) {
          setReviews([]);
          setLoading(false);
          return;
        }

        // 動画IDのリストを取得
        const videoIds = ratingsData.map(rating => rating.video_id);

        // videosテーブルからタイトル情報を取得
        const { data: videosData } = await supabase
          .from('videos')
          .select('youtube_id, title')
          .in('youtube_id', videoIds);

        // 動画IDをキーとしたタイトルマップを作成
        const titleMap: Record<string, string> = {};
        if (videosData && videosData.length > 0) {
          videosData.forEach(video => {
            if (video.youtube_id && video.title) {
              titleMap[video.youtube_id] = video.title;
            }
          });
        }

        // レビューデータに動画タイトルを追加
        const formattedReviews = ratingsData.map(rating => {
          // 動画IDに対応するタイトルを取得、なければデフォルト値を使用
          const videoTitle = titleMap[rating.video_id] || `YouTube動画 (ID: ${rating.video_id})`;
          
          return {
            id: rating.id,
            video_id: rating.video_id,
            user_id: rating.user_id,
            rating: rating.overall || 3, 
            comment: rating.comment || '',
            created_at: rating.created_at,
            updated_at: rating.updated_at,
            videoTitle: videoTitle
          };
        });

        setReviews(formattedReviews);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('レビューの読み込みに失敗しました。');
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  if (loading) {
    return (
      <ProfileLayout>
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-blue-400"></div>
        </div>
      </ProfileLayout>
    );
  }

  if (error) {
    return (
      <ProfileLayout>
        <div className="text-center py-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-indigo-600 hover:text-indigo-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            再読み込み
          </button>
        </div>
      </ProfileLayout>
    );
  }

  if (reviews.length === 0) {
    return (
      <ProfileLayout>
        <div className="text-center py-6">
          <p className="text-gray-600 dark:text-dark-text-secondary">まだレビューを投稿していません。</p>
          <button
            onClick={() => navigate('/')}
            className="mt-3 text-indigo-600 hover:text-indigo-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            動画を探す
          </button>
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">評価・レビュー履歴</h2>
          <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{reviews.length}件のレビュー</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-dark-surface">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                  動画
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider" style={{ width: '90px' }}>
                  評価
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                  コメント
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider" style={{ width: '100px' }}>
                  投稿日
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-bg divide-y divide-gray-200 dark:divide-dark-border">
              {reviews.map(review => (
                <tr 
                  key={review.id}
                  onClick={() => handleVideoClick(review.video_id)}
                  className="hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer"
                >
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-14 w-20 overflow-hidden rounded">
                        <img 
                          className="h-full w-full object-cover" 
                          src={getThumbnailUrl(review.video_id)} 
                          alt=""
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.jpg';
                          }}
                        />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary line-clamp-2 max-w-xs">
                          {review.videoTitle}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                          ID: {review.video_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-center align-top">
                    <div className="flex items-center justify-center">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            className={`h-3 w-3 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                            fill={star <= review.rating ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                      <span className="ml-1 text-xs text-gray-700 dark:text-dark-text-secondary">{review.rating}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="text-xs text-gray-900 dark:text-dark-text-primary line-clamp-2 max-w-xs">
                      {review.comment || "コメントなし"}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-dark-text-secondary align-top">
                    {new Date(review.created_at).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProfileLayout>
  );
};

export default ReviewHistory;