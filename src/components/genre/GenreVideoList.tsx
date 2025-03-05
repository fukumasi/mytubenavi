// src/components/genre/GenreVideoList.tsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Video } from '@/types';
import { YouTubeAPI } from '@/lib/youtube';
import GenreSidebar from './GenreSidebar';
import AdsSection from '../home/AdsSection';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';

export default function GenreVideoList() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [parentGenreId, setParentGenreId] = useState<string | undefined>(undefined);
    const [currentGenreName, setCurrentGenreName] = useState<string>('');
    const itemsPerPage = 20;
    const [hasMore, setHasMore] = useState(true);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Video;
        direction: 'asc' | 'desc';
    } | null>(null);

    const fetchVideosByGenre = useCallback(async () => {
        if (!slug) return;

        try {
            setLoading(true);
            setError(null);

            const { data: genreData, error: genreError } = await supabase
                .from('genres')
                .select('id, name, parent_genre_id, parent_genre:parent_genre_id(id, name)')
                .eq('slug', slug)
                .single();

            if (genreError || !genreData) {
                setError('ジャンルの取得に失敗しました');
                return;
            }

            setParentGenreId(genreData.parent_genre_id || genreData.id);
            setCurrentGenreName(genreData.name);

            const { videos: fetchedVideos } = await YouTubeAPI.searchVideos(
                genreData.name,
                itemsPerPage,
                {
                    page: page,
                    tags: [genreData.name]
                }
            );

            if (fetchedVideos) {
                setVideos(prevVideos => page === 1 ? fetchedVideos : [...prevVideos, ...fetchedVideos]);
                setHasMore(fetchedVideos.length >= itemsPerPage);
            } else {
                setHasMore(false);
            }

        } catch (err) {
            console.error('Error in fetchVideosByGenre:', err);
            setError('動画の取得に失敗しました');
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [slug, page]);

    useEffect(() => {
        fetchVideosByGenre();
    }, [fetchVideosByGenre]);

    const handleVideoClick = (videoId: string) => {
        navigate(`/video/${videoId}`);
    };

    const handleSubGenreClick = (slug: string) => {
        navigate(`/genre/${slug}`);
    };

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    const handleSort = (key: keyof Video) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // ソートロジックを改善
    const sortedVideos = useCallback(() => {
        if (!sortConfig) return videos;

        return [...videos].sort((a, b) => {
            // ★ここからソートロジックの修正★
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            const direction = sortConfig.direction === 'asc' ? 1 : -1;

            // undefined/nullの処理
            if (aValue === undefined || aValue === null) {
                return direction * -1; // undefinedは後ろにソート
            }
            if (bValue === undefined || bValue === null) {
                return direction; // undefinedは後ろにソート
            }

            // 文字列比較
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                // published_atは日付文字列として特別扱い
                if (sortConfig.key === 'published_at') {
                    return direction * (new Date(aValue).getTime() - new Date(bValue).getTime());
                }
                return direction * aValue.localeCompare(bValue);
            }

            // 数値比較
            if (
                (typeof aValue === 'number' || typeof aValue === 'string') &&
                (typeof bValue === 'number' || typeof bValue === 'string')
            ) {
                const aNum = typeof aValue === 'string' ? parseFloat(aValue) : aValue;
                const bNum = typeof bValue === 'string' ? parseFloat(bValue) : bValue;

                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return direction * (aNum - bNum);
                }
            }

            // オブジェクト比較（万が一のケース）
            if (typeof aValue === 'object' && typeof bValue === 'object') {
                if (aValue instanceof Date && bValue instanceof Date) {
                    return direction * (aValue.getTime() - bValue.getTime());
                }
                // JSONに変換して比較
                return direction * JSON.stringify(aValue).localeCompare(JSON.stringify(bValue));
            }

            // デフォルト: 変更なし
            return 0;
        });
    }, [videos, sortConfig]);

    if (loading && page === 1) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex gap-8">
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <GenreSidebar
                        activeGenre={currentGenreName}
                        onSubGenreClick={handleSubGenreClick}
                        parentGenreId={parentGenreId}
                    />
                </aside>

                <div className="flex-grow">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <h1 className="text-2xl font-bold p-4">{currentGenreName}の動画一覧</h1>

                        {error && (
                            <div className="p-4 text-red-600 bg-red-50">{error}</div>
                        )}

                        {!error && videos.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                動画が見つかりませんでした
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                                                タイトル {sortConfig?.key === 'title' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('rating')}>
                                                ★評価 {sortConfig?.key === 'rating' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('review_count')}>
                                                レビュー数 {sortConfig?.key === 'review_count' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('channel_title')}>
                                                チャンネル {sortConfig?.key === 'channel_title' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('published_at')}>
                                                投稿日 {sortConfig?.key === 'published_at' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('view_count')}>
                                                再生回数 {sortConfig?.key === 'view_count' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedVideos().map((video) => (
                                            <TableRow
                                                key={video.id}
                                                onClick={() => handleVideoClick(video.id)}
                                                className="cursor-pointer hover:bg-gray-50"
                                            >
                                                <TableCell className="flex items-center space-x-3">
                                                    <img
                                                        src={video.thumbnail}
                                                        alt={video.title}
                                                        className="w-24 h-auto rounded"
                                                    />
                                                    <span>{video.title}</span>
                                                </TableCell>
                                                <TableCell>{video.rating?.toFixed(1) || '-'}</TableCell>
                                                <TableCell>{video.review_count?.toLocaleString() || '-'}</TableCell>
                                                <TableCell>
                                                    <a
                                                        href={`https://www.youtube.com/channel/${video.channel_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {video.channel_title}
                                                    </a>
                                                </TableCell>
                                                <TableCell>{video.published_at ? new Date(video.published_at).toLocaleDateString('ja-JP') : '-'}</TableCell>
                                                <TableCell>{video.view_count ? (video.view_count / 10000).toFixed(1) + '万 回視聴' : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {hasMore && (
                            <div className="text-center py-4">
                                <button
                                    onClick={handleLoadMore}
                                    className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition"
                                    disabled={loading}
                                >
                                    {loading ? '読み込み中...' : 'さらに読み込む'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <div className="sticky top-4">
                        <AdsSection />
                    </div>
                </aside>
            </div>
        </div>
    );
}