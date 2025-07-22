// src/components/profile/ViewHistory.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock, Star, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ProfileLayout from './ProfileLayout';
import type { Video } from '@/types';

/* ----------------------------- 型定義 ----------------------------- */
interface HistoryVideo extends Video {
  viewed_at?: string;
}

/* --------------------------- コンポーネント --------------------------- */
export default function ViewHistory() {
  const [history, setHistory] = useState<HistoryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const navigate = useNavigate();

  /* ------------------------- データ取得 ------------------------- */
  useEffect(() => {
    async function fetchViewHistory() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error('ユーザーが認証されていません');

        const { data, error } = await supabase
          .from('view_history')
          .select(
            '*, videos(id, youtube_id, title, thumbnail, channel_title, published_at, view_count, rating, duration)',
          )
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false });

        if (error) throw error;

        const formatted: HistoryVideo[] =
          data
            ?.filter((h) => h.videos !== null)
            .map((h) => ({
              id: h.videos.id,
              youtube_id: h.videos.youtube_id ?? '',
              title: h.videos.title ?? '不明な動画',
              description: '',
              thumbnail: h.videos.thumbnail ?? '/placeholder.jpg',
              channel_title: h.videos.channel_title ?? '不明なチャンネル',
              published_at: h.videos.published_at,
              view_count: h.videos.view_count ?? 0,
              rating: h.videos.rating,
              duration: h.videos.duration,
              review_count: 0,
              viewed_at: h.viewed_at,
            })) ?? [];

        setHistory(formatted);
      } catch (e) {
        console.error('視聴履歴の取得エラー:', e);
        setError(e instanceof Error ? e.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }

    fetchViewHistory();
  }, []);

  /* --------------------------- UI --------------------------- */
  if (loading)
    return (
      <ProfileLayout>
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-blue-400" />
        </div>
      </ProfileLayout>
    );

  if (error)
    return (
      <ProfileLayout>
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded"
          >
            再読み込み
          </button>
        </div>
      </ProfileLayout>
    );

  return (
    <ProfileLayout>
      <div className="space-y-6">
        {/* --- ヘッダー --- */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            視聴履歴
          </h2>
          <div className="flex items-center gap-4">
            {/* 今後の拡張: 分析ビュー切替 */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              disabled
            >
              <BarChart3 size={16} />
              {showAnalytics ? 'リストビュー' : '分析ビュー'}
            </button>
            <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
              {`${history.length}件の動画`}
            </span>
          </div>
        </div>

        {/* --- 履歴リスト or 空状態 --- */}
        {history.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-dark-text-secondary">
              視聴履歴はありません
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-indigo-600 hover:text-indigo-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              動画を探す
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((v) => (
              <div
                key={`${v.id}-${v.viewed_at}`}
                onClick={() => navigate(`/video/${v.youtube_id}`)}
                className="bg-white dark:bg-dark-surface rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex p-4">
                  {/* サムネイル */}
                  <div className="relative flex-shrink-0 w-48">
                    <img
                      src={v.thumbnail ?? '/placeholder.jpg'}
                      alt={v.title}
                      className="w-full h-27 object-cover rounded-lg"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src = '/placeholder.jpg')
                      }
                    />
                    {v.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                        {v.duration}
                      </span>
                    )}
                  </div>

                  {/* メタ情報 */}
                  <div className="ml-4 flex-grow">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2 line-clamp-2">
                      {v.title}
                    </h3>

                    <div className="flex items-center text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                      <span className="font-medium">{v.channel_title}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-dark-text-secondary">
                      {/* 再生回数 */}
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        <span>
                          {v.view_count
                            ? `${(v.view_count / 10000).toFixed(1)}万回視聴`
                            : '再生回数不明'}
                        </span>
                      </div>

                      {/* レーティング */}
                      {v.rating !== undefined && (
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span>{v.rating.toFixed(1)}</span>
                        </div>
                      )}

                      {/* 視聴日 */}
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          視聴日:{' '}
                          {new Date(
                            v.viewed_at ?? v.published_at,
                          ).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProfileLayout>
  );
}
