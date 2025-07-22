// src/components/genre/GenreSidebar.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Genre } from '@/types';

interface GenreSidebarProps {
  /** 現在表示しているジャンル名（例: "音楽"）。 */
  activeGenre?: string;
  /** クリック時に親コンポーネントへ slug を返すコールバック。 */
  onSubGenreClick?: (subGenreSlug: string) => void;
  /** ルートまたは親ジャンルの ID。 */
  parentGenreId?: string;
}

interface GenreWithSubGenres extends Genre {
  subGenres?: GenreWithSubGenres[];
}

export default function GenreSidebar({
  activeGenre,
  onSubGenreClick,
  parentGenreId,
}: GenreSidebarProps) {
  const [genres, setGenres] = useState<GenreWithSubGenres[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------ */
  /* Supabase から親ジャンル配下のサブジャンルを取得            */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    const fetchGenreHierarchy = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!parentGenreId) {
          setGenres([]);
          return;
        }

        const { data, error: subGenresError } = await supabase
          .from('genres')
          .select('*')
          .eq('parent_genre_id', parentGenreId)
          .order('order');

        if (subGenresError) throw subGenresError;

        setGenres(data || []);
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError('ジャンルの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGenreHierarchy();
  }, [parentGenreId]);

  /* ------------------------------------------------------------ */
  /* UI ハンドラ                                                  */
  /* ------------------------------------------------------------ */
  const handleGenreClick = (slug: string) => {
    onSubGenreClick?.(slug);
  };

  /* ------------------------------------------------------------ */
  /* レンダリング                                                 */
  /* ------------------------------------------------------------ */
  if (loading)
    return (
      <div className="animate-pulse h-full w-full bg-gray-200 dark:bg-gray-700" />
    );

  if (error)
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>;

  if (genres.length === 0)
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        サブジャンルがありません
      </div>
    );

  return (
    <div className="bg-gray-50 dark:bg-dark-surface rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4 dark:text-dark-text-primary">
        サブジャンル
      </h2>

      <div className="space-y-2">
        {genres.map((genre) => {
          const isActive = activeGenre === genre.name; // ← ★ 名前で比較
          return (
            <div
              key={genre.id}
              className={`flex items-center py-2 px-4 rounded-md cursor-pointer transition-colors
                ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-dark-text-primary'
                }`}
              onClick={() => handleGenreClick(genre.slug)}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* 任意でアイコンが登録されている場合は表示 */}
              {genre.icon && <span className="mr-2">{genre.icon}</span>}
              <span>{genre.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
