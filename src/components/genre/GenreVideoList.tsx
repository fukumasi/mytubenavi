import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGenreInfo, getSubGenres, searchVideos } from '../../lib/supabase';
import GenreSidebar from './GenreSidebar';

const genreNames: Record<string, string> = {
  music: '音楽',
  gaming: 'ゲーム',
  entertainment: 'エンターテイメント',
  education: '教育',
  technology: 'テクノロジー',
  lifestyle: 'ライフスタイル',
  sports: 'スポーツ',
  news: 'ニュース'
};

// ソートキーの型定義
type SortKey = 'publishedAt' | 'rating' | 'commentCount' | 'viewCount';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  viewCount: number;
  rating: number;
  publishedAt: string;
  channelTitle: string;
  commentCount?: number;
  youtuber?: {
    channelName: string;
    channelUrl: string;
    verificationStatus: 'verified' | 'unverified' | 'unknown';
  };
}

export default function GenreVideoList() {
  const { genre, subGenre } = useParams<{ genre: string; subGenre?: string }>();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('publishedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [genreInfo, setGenreInfo] = useState<{ id: string; name: string; slug: string } | null>(
    null
  );
  const [subGenres, setSubGenres] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGenreData = async () => {
      if (!genre) return;

      try {
        setLoading(true);
        setError(null);

        const info = await getGenreInfo(genre);
        if (info) {
          setGenreInfo({ ...info, id: info.id.toString() });
        }

        const subGenreData = await getSubGenres(genre);
        setSubGenres(subGenreData.map(subGenre => ({ ...subGenre, id: subGenre.id.toString() })));

        const searchQuery = subGenre || genre;
        const { videos: searchResults } = await searchVideos(searchQuery);
        setVideos(searchResults.map(video => ({
          id: video.id,
          title: video.title,
          description: video.description || '',
          thumbnail: video.thumbnail,
          duration: video.duration || '',
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          rating: video.rating,
          commentCount: video.commentCount || 0
        })));
      } catch (err) {
        console.error('Error fetching genre data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGenreData();
  }, [genre, subGenre]);

  const genreName = genreInfo?.name || genreNames[genre || ''] || genre;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };


  // ソート関数の修正
  const sortVideos = (a: Video, b: Video, sortKey: SortKey): number => {
    if (sortKey === 'publishedAt') {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    return (b[sortKey] as number) - (a[sortKey] as number);
  };

  // コンポーネント内のソート処理
  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => sortVideos(a, b, sortKey as SortKey));
  }, [videos, sortKey]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {genreName}の動画一覧
        {subGenre && (
          <>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-2xl">
              {subGenres.find((g) => g.slug === subGenre)?.name || subGenre}
            </span>
          </>
        )}
      </h1>

      <div className="flex gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <GenreSidebar
            parentGenre={genre || ''}
            subGenres={subGenres}
            activeGenre={subGenre}
          />
        </div>

        <div className="flex-grow">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {sortedVideos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">動画が見つかりませんでした</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        動画情報
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                        onClick={() => handleSort('publishedAt')}
                      >
                        アップ日
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                        onClick={() => handleSort('rating')}
                      >
                        評価
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                        onClick={() => handleSort('commentCount')}
                      >
                        コメント
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                        onClick={() => handleSort('viewCount')}
                      >
                        視聴回数
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedVideos.map((video) => (
                      <tr
                        key={video.id}
                        onClick={() => handleVideoClick(video.id)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start space-x-4">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-40 h-24 object-cover rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {video.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {video.channelTitle}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{new Date(video.publishedAt).toLocaleDateString('ja-JP')}</td>
                        <td className="px-6 py-4">{video.rating.toFixed(1)}</td>
                        <td className="px-6 py-4">{video.commentCount?.toLocaleString() || '-'}</td>
                        <td className="px-6 py-4">{(video.viewCount / 10000).toFixed(1)}万</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
