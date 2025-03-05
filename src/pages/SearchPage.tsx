// src/pages/SearchPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, Loader } from 'lucide-react';
import { searchVideos } from '../lib/supabase';
import { YouTubeAPI } from '../lib/youtube';
import type { Video, VideoFilter, SortOption } from '../types';
import debounce from 'lodash/debounce';
import { supabase } from '@/lib/supabase';

export default function SearchPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [videos, setVideos] = useState<Video[]>([]);
    const [allVideos, setAllVideos] = useState<Video[]>([]);  // 全ての検索結果を保持
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<VideoFilter>({});
    const [sort, setSort] = useState<SortOption>({
        field: 'published_at',
        direction: 'desc'
    });
    const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
    const resultsPerPage = 10;  // 1ページあたりの表示件数

    const fetchRelatedVideos = useCallback(async (searchQuery: string) => {
        if (!searchQuery) return [];
        try {
            const { data: genres, error: genreError } = await supabase
                .from('genres')
                .select('id, name')
                .ilike('name', `%${searchQuery}%`)
                .limit(3);

            if (genreError || !genres || genres.length === 0) return [];

            const relatedVideos = await Promise.all(genres.map(async (genre: any) => {
                const { videos } = await YouTubeAPI.searchVideos(
                    genre.name,
                    3,
                );
                return videos;
            }));
            return relatedVideos.flat();

        } catch (error) {
            console.error('Error fetching related videos:', error);
            return [];
        }
    }, []);

    const debouncedSearch = useCallback(
        debounce(async (searchQuery: string) => {
            if (!searchQuery.trim()) {
                setVideos([]);
                setAllVideos([]);
                setTotalPages(0);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const dbResult = await searchVideos(searchQuery);

                if (dbResult.videos.length === 0) {
                    const youtubeResult = await YouTubeAPI.searchVideos(searchQuery, 10);
                    setAllVideos(youtubeResult.videos);
                    setVideos(youtubeResult.videos.slice(0, resultsPerPage));
                    setTotalPages(Math.ceil(youtubeResult.totalResults / resultsPerPage));
                    const related = await fetchRelatedVideos(searchQuery);
                    setRelatedVideos(related);
                } else {
                    let filteredVideos = dbResult.videos;

                    if (filter.genre_id) {
                        filteredVideos = filteredVideos.filter(v => v.genre_id === filter.genre_id);
                    }

                    filteredVideos.sort((a, b) => {
                        const factor = sort.direction === 'asc' ? 1 : -1;
                        if (sort.field === 'published_at') {
                            return factor * (new Date(a.published_at || "").getTime() - new Date(b.published_at || "").getTime());
                        }
                        return factor * ((Number(a[sort.field as keyof Video]) || 0) - (Number(b[sort.field as keyof Video]) || 0));
                    });

                    setAllVideos(filteredVideos);
                    const totalPages = Math.ceil(filteredVideos.length / resultsPerPage);
                    setTotalPages(totalPages);

                    // ページが存在する範囲に収める
                    const validPage = Math.min(Math.max(1, currentPage), totalPages || 1);
                    if (validPage !== currentPage) {
                        setCurrentPage(validPage);
                    }

                    const startIndex = (validPage - 1) * resultsPerPage;
                    const endIndex = startIndex + resultsPerPage;
                    setVideos(filteredVideos.slice(startIndex, endIndex));
                    setRelatedVideos([]);
                }
            } catch (err) {
                setError('検索中にエラーが発生しました。もう一度お試しください。');
                console.error('Search error:', err);
            } finally {
                setIsLoading(false);
            }
        }, 500),
        [filter, sort, currentPage, fetchRelatedVideos]
    );

    useEffect(() => {
        if (query) {
            debouncedSearch(query);
        }
        return () => {
            debouncedSearch.cancel();
        };
    }, [query, debouncedSearch]);

    // ページ変更時に表示する動画を更新
    useEffect(() => {
        if (allVideos.length > 0) {
            const startIndex = (currentPage - 1) * resultsPerPage;
            const endIndex = startIndex + resultsPerPage;
            setVideos(allVideos.slice(startIndex, endIndex));
        }
    }, [currentPage, allVideos]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        // 画面上部にスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="container mx-auto p-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    {/* 検索ボックスを削除して、検索結果のタイトルを表示 */}
                    <div className="flex-grow">
                        <h1 className="text-xl font-bold text-gray-800">「{query}」の検索結果</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={sort.field}
                            onChange={(e) => setSort({ ...sort, field: e.target.value as SortOption['field'] })}
                            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="published_at">投稿日時</option>
                            <option value="view_count">視聴回数</option>
                            <option value="rating">評価</option>
                        </select>
                        <button
                            onClick={() => setSort({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
                            className="p-2 border rounded-lg hover:bg-gray-50"
                        >
                            {sort.direction === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>

                    <button
                        onClick={() => setFilter({})}
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        <Filter className="w-4 h-4" />
                        フィルター
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {videos.length > 0 ? (
                            videos.map((video) => (
                                <div
                                    key={video.id}
                                    className="flex gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => navigate(`/video/${video.id}`)}
                                >
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        className="w-40 h-24 object-cover rounded-md flex-shrink-0"
                                    />
                                    <div className="flex-grow min-w-0">
                                        <h2 className="text-lg font-bold line-clamp-2">{video.title}</h2>
                                        <p className="text-gray-700 text-sm line-clamp-2 mt-1">
                                            {video.description}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                            <a
                                                href={`https://www.youtube.com/channel/${video.channel_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-indigo-600 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {video.channel_title}
                                            </a>
                                            <span>•</span>
                                            <span>{new Date(video.published_at).toLocaleDateString('ja-JP')}</span>
                                            <span>•</span>
                                            <span>{video.view_count?.toLocaleString()} 回視聴</span>
                                            {video.rating > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>評価: {video.rating.toFixed(1)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            query && (
                                <div className="text-center py-12 text-gray-500">
                                    <p>検索結果が見つかりませんでした</p>
                                    {relatedVideos.length > 0 && (
                                        <div className="mt-8">
                                            <h2 className="text-xl font-semibold mb-4 text-gray-800">関連動画</h2>
                                            <div className="flex overflow-x-auto gap-4 py-2">
                                                {relatedVideos.map(video => (
                                                    <div
                                                        key={video.id}
                                                        className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow w-64 flex-shrink-0"
                                                    >
                                                        <img
                                                            src={video.thumbnail}
                                                            alt={video.title}
                                                            className="w-full h-32 object-cover"
                                                        />
                                                        <div className="p-2">
                                                            <h3 className="text-sm font-medium text-gray-900 truncate">
                                                                {video.title}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {video.channel_title}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-md transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            前へ
                        </button>

                        {/* ページ数が多い場合は省略表示 */}
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            // 表示するページ番号を調整
                            let pageNum;
                            if (totalPages <= 5) {
                                // 5ページ以下なら全て表示
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                // 現在のページが前方にある場合
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                // 現在のページが後方にある場合
                                pageNum = totalPages - 4 + i;
                            } else {
                                // 現在のページが中央にある場合
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`px-4 py-2 rounded-md transition-colors ${
                                        currentPage === pageNum
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-md transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            次へ
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}