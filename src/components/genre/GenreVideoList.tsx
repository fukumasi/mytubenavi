// src/components/genre/GenreVideoList.tsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Video } from '@/types';
import { YouTubeAPI } from '@/lib/youtube';
import GenreSidebar from './GenreSidebar';
import AdsSection from '../home/AdsSection';
import { Star, Eye, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';
import useMediaQuery from '@/hooks/useMediaQuery';


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
    
    // モバイル表示かどうかを判定
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    // 追加: 表示フィルターの状態
    const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'shorts'>('all');

    // ショート動画かどうかを判定する関数（タイトルに#shortsがあるか、または60秒以下かで判定）
    const isShortVideo = (video: Video): boolean => {
        // 1. タイトルに #shorts が含まれているか
        const hasShortsTag = video.title && (
            video.title.toLowerCase().includes('#shorts') || 
            video.title.toLowerCase().includes(' shorts') || 
            video.title.toLowerCase().includes('#short')
        );
        
        if (hasShortsTag) return true;
        
        // 2. 動画の長さが60秒以下かどうか
        if (video.duration) {
            // "PT1M34S" のような形式の場合
            if (video.duration.startsWith('PT')) {
                const minutes = video.duration.includes('M') 
                    ? parseInt(video.duration.split('M')[0].replace('PT', '')) 
                    : 0;
                
                const seconds = video.duration.includes('S') 
                    ? parseInt(video.duration.split('S')[0].split('M').pop() || video.duration.split('S')[0].replace('PT', '')) 
                    : 0;
                
                const totalSeconds = minutes * 60 + seconds;
                return totalSeconds <= 60;
            }
            
            // "01:00" のような形式の場合
            if (video.duration.includes(':')) {
                const parts = video.duration.split(':');
                if (parts.length === 2) {
                    const minutes = parseInt(parts[0]);
                    const seconds = parseInt(parts[1]);
                    const totalSeconds = minutes * 60 + seconds;
                    return totalSeconds <= 60;
                }
                
                if (parts.length === 3) { // "00:00:49" のような形式
                    const hours = parseInt(parts[0]);
                    const minutes = parseInt(parts[1]);
                    const seconds = parseInt(parts[2]);
                    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                    return totalSeconds <= 60;
                }
            }
        }
        
        return false;
    };

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
                console.error('Genre fetch error:', genreError);
                setError('ジャンルの取得に失敗しました');
                return;
            }

            setParentGenreId(genreData.parent_genre_id || genreData.id);
            setCurrentGenreName(genreData.name);

            try {
                // まずYouTube APIを試す - ジャンル名とIDを使用
                const searchParams = {
                    page: page,
                    tags: [genreData.name],
                    genreId: genreData.id // ジャンルIDを追加
                };
                
                const { videos: fetchedVideos } = await YouTubeAPI.searchVideos(
                    genreData.name,  // 検索キーワードとしてジャンル名を使用
                    itemsPerPage,
                    searchParams
                );

                if (fetchedVideos && fetchedVideos.length > 0) {
                    setVideos(prevVideos => page === 1 ? fetchedVideos : [...prevVideos, ...fetchedVideos]);
                    setHasMore(fetchedVideos.length >= itemsPerPage);
                    return;
                } else {
                    throw new Error('No videos found from YouTube API');
                }
            } catch (apiError) {
                console.error('YouTube API error:', apiError);
                
                // API呼び出しに失敗した場合はSupabaseからデータを取得
                console.log('Falling back to Supabase for video data');
                
                // まず特定のジャンルIDに関連する動画を検索
                const { data: genreVideos, error: genreVideoError } = await supabase
                    .from('videos')
                    .select('*')
                    .eq('genre_id', genreData.id) // ジャンルIDでフィルタリング
                    .order('published_at', { ascending: false })
                    .limit(itemsPerPage);
                
                if (genreVideoError) {
                    console.error('Supabase genre videos error:', genreVideoError);
                    // genreVideoエラーはスローせず、次のフォールバックへ
                } else if (genreVideos && genreVideos.length > 0) {
                    setVideos(genreVideos);
                    setHasMore(genreVideos.length >= itemsPerPage);
                    return;
                }
                
                // ジャンル特定の検索が失敗した場合、すべての動画からタイトルや説明で検索
                const { data: searchVideos, error: searchError } = await supabase
                    .from('videos')
                    .select('*')
                    .or(`title.ilike.%${genreData.name}%,description.ilike.%${genreData.name}%`)
                    .order('published_at', { ascending: false })
                    .limit(itemsPerPage);
                
                if (searchError) {
                    console.error('Supabase search videos error:', searchError);
                    // それでも失敗した場合は最新の動画を表示
                    const { data: fallbackVideos, error: fallbackError } = await supabase
                        .from('videos')
                        .select('*')
                        .order('published_at', { ascending: false })
                        .limit(itemsPerPage);
                        
                    if (fallbackError) {
                        console.error('Supabase fallback error:', fallbackError);
                        throw fallbackError;
                    }
                    
                    if (fallbackVideos && fallbackVideos.length > 0) {
                        setVideos(fallbackVideos);
                        setHasMore(false); // フォールバックではページネーションを無効に
                        console.log('Using general fallback videos');
                    } else {
                        setVideos([]);
                        setHasMore(false);
                        setError('動画が見つかりませんでした。別のジャンルをお試しください。');
                    }
                } else if (searchVideos && searchVideos.length > 0) {
                    setVideos(searchVideos);
                    setHasMore(searchVideos.length >= itemsPerPage);
                    console.log('Using keyword search fallback videos');
                } else {
                    // すべての検索方法が失敗した場合
                    setVideos([]);
                    setHasMore(false);
                    setError('動画が見つかりませんでした。別のジャンルをお試しください。');
                }
            }
        } catch (err) {
            console.error('Error in fetchVideosByGenre:', err);
            setError('動画の取得に失敗しました。時間をおいて再度お試しください。');
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

    // タブに応じてフィルタリングした動画を取得
    const filteredVideos = useCallback(() => {
        if (activeTab === 'all') return sortedVideos();
        
        return sortedVideos().filter(video => {
            const isShort = isShortVideo(video);
            return activeTab === 'shorts' ? isShort : !isShort;
        });
    }, [sortedVideos, activeTab]);

    // 各タイプの動画数をカウント
    const shortsCount = videos.filter(video => isShortVideo(video)).length;
    const normalCount = videos.length - shortsCount;

    // 現在のタブに基づいて、さらに読み込むべきデータがあるかどうかを判断
    const shouldShowLoadMore = useCallback(() => {
        if (!hasMore) return false;
        if (loading) return false;
        
        // カレントのフィルタリング後の動画数が少なすぎる場合は、さらに読み込むボタンを表示
        const currentFilteredLength = filteredVideos().length;
        
        return currentFilteredLength > 0;
    }, [hasMore, loading, filteredVideos]);

    const formatViewCount = (count?: number) => {
        if (!count) return '-';
        if (count >= 10000) {
            return `${(count / 10000).toFixed(1)}万`;
        }
        return count.toLocaleString();
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ja-JP');
    };

    if (loading && page === 1) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // モバイル表示用ソートボタン
    const renderSortButtons = () => (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500 w-full mb-1">並び替え:</span>
            <button
                onClick={() => handleSort('title')}
                className={`px-2 py-1 text-xs rounded-full border flex items-center ${
                    sortConfig?.key === 'title' ? 'bg-indigo-600 text-white' : 'bg-white'
                }`}
            >
                タイトル
                {sortConfig?.key === 'title' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                )}
            </button>
            <button
                onClick={() => handleSort('rating')}
                className={`px-2 py-1 text-xs rounded-full border flex items-center ${
                    sortConfig?.key === 'rating' ? 'bg-indigo-600 text-white' : 'bg-white'
                }`}
            >
                評価
                {sortConfig?.key === 'rating' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                )}
            </button>
            <button
                onClick={() => handleSort('view_count')}
                className={`px-2 py-1 text-xs rounded-full border flex items-center ${
                    sortConfig?.key === 'view_count' ? 'bg-indigo-600 text-white' : 'bg-white'
                }`}
            >
                再生回数
                {sortConfig?.key === 'view_count' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                )}
            </button>
            <button
                onClick={() => handleSort('published_at')}
                className={`px-2 py-1 text-xs rounded-full border flex items-center ${
                    sortConfig?.key === 'published_at' ? 'bg-indigo-600 text-white' : 'bg-white'
                }`}
            >
                投稿日
                {sortConfig?.key === 'published_at' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> : <ArrowDown className="ml-1 w-3 h-3" />
                )}
            </button>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <GenreSidebar
                        activeGenre={currentGenreName}
                        onSubGenreClick={handleSubGenreClick}
                        parentGenreId={parentGenreId}
                    />
                </aside>

                <div className="flex-grow">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <h1 className="text-xl md:text-2xl font-bold p-4">{currentGenreName}の動画一覧</h1>

                        {/* 動画タイプ切り替えタブを追加 */}
                        <div className="flex border-b border-gray-200 px-4">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                    activeTab === 'all' 
                                        ? 'border-indigo-600 text-indigo-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                すべて ({videos.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('normal')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                    activeTab === 'normal' 
                                        ? 'border-indigo-600 text-indigo-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                通常動画 ({normalCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('shorts')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                    activeTab === 'shorts' 
                                        ? 'border-indigo-600 text-indigo-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                ショート ({shortsCount})
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 text-red-600 bg-red-50">{error}</div>
                        )}

                        {!error && filteredVideos().length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                {activeTab === 'all' 
                                    ? '動画が見つかりませんでした' 
                                    : activeTab === 'shorts' 
                                        ? 'このジャンルにはショート動画がありません' 
                                        : 'このジャンルには通常動画がありません'}
                            </div>
                        ) : (
                            <>
                                {/* モバイル表示の場合はソートボタンを表示 */}
                                {isMobile && renderSortButtons()}
                                
                                {isMobile ? (
                                    // モバイル用カードレイアウト
                                    <div className="space-y-4 px-3 pb-4">
                                        {filteredVideos().map((video) => (
                                            <div
                                                key={video.id}
                                                onClick={() => handleVideoClick(video.youtube_id || video.id)}
                                                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border"
                                            >
                                                {/* 上段：サムネイルと動画タイトル */}
                                                <div className="flex flex-row p-2 border-b border-gray-100">
                                                    {/* サムネイル - 左側に配置 */}
                                                    <div className="relative w-32 h-20 flex-shrink-0">
                                                        <img
                                                            src={video.thumbnail || '/placeholder.jpg'}
                                                            alt={video.title}
                                                            className="w-full h-full object-cover rounded-sm"
                                                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                const target = e.currentTarget;
                                                                target.onerror = null;
                                                                target.src = '/placeholder.jpg';
                                                            }}
                                                            loading="lazy"
                                                        />
                                                        {/* ショート動画バッジ */}
                                                        {isShortVideo(video) && (
                                                            <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 py-0.5 rounded-bl">
                                                                ショート
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* タイトル - 右側に配置 */}
                                                    <div className="flex-1 ml-2 overflow-hidden">
                                                        <p className="text-xs font-medium line-clamp-3 text-gray-900">
                                                            {video.title}
                                                        </p>
                                                        {video.channel_title && (
                                                            <p className="text-xs text-gray-600 mt-1 truncate">
                                                                {video.channel_title}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* 下段：評価、再生回数、投稿日 */}
                                                <div className="flex justify-between px-2 py-1 text-xs text-gray-500 bg-gray-50">
                                                    {/* 星評価 */}
                                                    <div className="flex items-center">
                                                        <Star className="h-3 w-3 text-yellow-400 mr-1" />
                                                        <span>{video.rating?.toFixed(1) || '-'}</span>
                                                    </div>
                                                    
                                                    {/* 再生回数 */}
                                                    <div className="flex items-center">
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        <span>{formatViewCount(video.view_count)}</span>
                                                    </div>
                                                    
                                                    {/* 投稿日 */}
                                                    <div className="flex items-center">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        <span>{formatDate(video.published_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // デスクトップ用テーブルレイアウト
                                    
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
                                                {filteredVideos().map((video) => (
                                                    <TableRow
                                                        key={video.id}
                                                        onClick={() => handleVideoClick(video.youtube_id || video.id)}
                                                        className="cursor-pointer hover:bg-gray-50"
                                                    >
                                                        <TableCell className="flex items-center space-x-3">
                                                            <div className="relative">
                                                                <img
                                                                    src={video.thumbnail || '/placeholder.jpg'}
                                                                    alt={video.title}
                                                                    className="w-24 h-auto rounded"
                                                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                        const target = e.currentTarget;
                                                                        target.onerror = null;
                                                                        target.src = '/placeholder.jpg';
                                                                    }}
                                                                />
                                                                {/* ショート動画バッジ */}
                                                                {isShortVideo(video) && (
                                                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 py-0.5 rounded-bl">
                                                                        ショート
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span>{video.title}</span>
                                                        </TableCell>
                                                        <TableCell>{video.rating?.toFixed(1) || '-'}</TableCell>
                                                        <TableCell>{video.review_count?.toLocaleString() || '-'}</TableCell>
                                                        <TableCell>
                                                            {video.channel_title && (
                                                                <a
                                                                    href={`https://www.youtube.com/channel/${video.channel_id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-indigo-600 hover:underline"
                                                                    onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => e.stopPropagation()}
                                                                >
                                                                    {video.channel_title}
                                                                </a>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{formatDate(video.published_at)}</TableCell>
                                                        <TableCell>{formatViewCount(video.view_count)} 回視聴</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    
                                )}
                            </>
                        )}

                        {shouldShowLoadMore() && (
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