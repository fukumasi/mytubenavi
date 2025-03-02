// src/pages/SearchPage.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Loader } from 'lucide-react';
import { searchVideos } from '../lib/supabase';
import { YouTubeAPI } from '../lib/youtube';
import type { Video, VideoFilter, SortOption } from '../types';
import debounce from 'lodash/debounce';
import { supabase } from '@/lib/supabase';

export default function SearchPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [videos, setVideos] = useState<Video[]>([]);
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

    const fetchRelatedVideos = useCallback(async (query: string) => {
        if (!query) return [];
        try {
            const { data: genres, error: genreError } = await supabase
                .from('genres')
                .select('id, name')
                .ilike('name', `%${query}%`)
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
    }, [query]);

    const debouncedSearch = useCallback(
        debounce(async (searchQuery: string) => {
            if (!searchQuery.trim()) {
                setVideos([]);
                setTotalPages(0);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const dbResult = await searchVideos(searchQuery);

                if (dbResult.videos.length === 0) {
                    const youtubeResult = await YouTubeAPI.searchVideos(searchQuery, 10);
                    setVideos(youtubeResult.videos);
                    setTotalPages(Math.ceil(youtubeResult.totalResults / 10));
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
                        
                    setVideos(filteredVideos.slice((currentPage - 1) * 10, currentPage * 10));
                    setTotalPages(Math.ceil(filteredVideos.length / 10));
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
            setSearchParams({ q: query });
        }
        return () => {
            debouncedSearch.cancel();
        };
    }, [query, debouncedSearch, setSearchParams]);

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

     const currentVideos = useMemo(() => {
        const startIndex = (currentPage - 1) * 10;
        const endIndex = startIndex + 10;
        return videos.slice(startIndex, endIndex);
    }, [videos, currentPage]);

    return (
        <div className="container mx-auto p-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="動画を検索..."
                            value={query}
                            onChange={handleSearchInput}
                        />
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
                        {currentVideos.length > 0 ? (
                            currentVideos.map((video) => (
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
                                            <span>{video.channel_title}</span>
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    currentPage === page
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}