// src/components/genre/GenreVideoList.tsx
import React, { useState, useEffect, useCallback } from 'react';
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function GenreVideoList() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  /* ------------------------------ state --------------------------- */
  const [videos, setVideos]   = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [page, setPage]       = useState(1);

  const [parentGenreId, setParentGenreId]   = useState<string>();
  const [currentGenreName, setCurrentGenreName] = useState('');
  const itemsPerPage = 20;
  const [hasMore, setHasMore] = useState(true);

  const [sortConfig, setSortConfig] = useState<
    | { key: keyof Video; direction: 'asc' | 'desc' }
    | null
  >(null);

  const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'shorts'>('all');
  const isMobile = useMediaQuery('(max-width: 768px)');

  /* ------------------------------ utils --------------------------- */
  /** タイトルに #shorts / 長さ 60 秒以下ならショート */
  const isShortVideo = useCallback((v: Video) => {
    if (
      v.title &&
      ['#shorts', ' shorts', '#short'].some(t =>
        v.title.toLowerCase().includes(t)
      )
    )
      return true;

    if (v.duration) {
      if (v.duration.startsWith('PT')) {
        const m = v.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (m) {
          const sec =
            parseInt(m[1] || '0') * 3600 +
            parseInt(m[2] || '0') * 60 +
            parseInt(m[3] || '0');
          return sec > 0 && sec <= 60;
        }
      }
      if (v.duration.includes(':')) {
        const p = v.duration.split(':').map(Number);
        const sec =
          p.length === 2
            ? p[0] * 60 + p[1]
            : p.length === 3
            ? p[0] * 3600 + p[1] * 60 + p[2]
            : 0;
        return sec > 0 && sec <= 60;
      }
    }
    return false;
  }, []);

  /* ------------------------------ fetch --------------------------- */
  const fetchVideosByGenre = useCallback(async () => {
    if (!slug) return;

    page === 1
      ? (setLoading(true), setVideos([]), setHasMore(true), setError(null))
      : setLoading(true);

    try {
      /* genre 情報取得 */
      const { data: g, error: gErr } = await supabase
        .from('genres')
        .select('id, name, parent_genre_id')
        .eq('slug', slug)
        .single();
      if (gErr || !g) throw new Error('ジャンル取得失敗');

      setParentGenreId(g.parent_genre_id || g.id);
      setCurrentGenreName(g.name);

      let fetched: Video[] = [];
      let apiOk = false;

      /* 1) YouTube API */
      try {
        if (typeof YouTubeAPI.searchVideos === 'function') {
          const res = await YouTubeAPI.searchVideos(g.name, itemsPerPage, {
            page,
          });
          fetched = res?.videos || [];
          setHasMore(fetched.length >= itemsPerPage);
          apiOk = fetched.length > 0;
        }
      } catch {
        /* ignore */
      }

      /* 2) Supabase fallback */
      if (!apiOk) {
        const { data: byGenre } = await supabase
          .from('videos')
          .select('*')
          .eq('genre_id', g.id)
          .order('published_at', { ascending: false })
          .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
        fetched = byGenre || [];

        if (!fetched.length) {
          const { data: byKw } = await supabase
            .from('videos')
            .select('*')
            .or(`title.ilike.%${g.name}%,description.ilike.%${g.name}%`)
            .order('published_at', { ascending: false })
            .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
          fetched = byKw || [];
        }
        setHasMore(fetched.length >= itemsPerPage);
      }

      /* merge + unique */
      if (fetched.length) {
        setVideos(prev =>
          (page === 1 ? fetched : [...prev, ...fetched]).filter(
            (v, i, self) => i === self.findIndex(s => s.youtube_id === v.youtube_id)
          )
        );
      } else {
        if (page === 1)
          setError('動画が見つかりませんでした。別のジャンルをお試しください。');
        setHasMore(false);
      }
    } catch (e: any) {
      setError(e.message ?? '動画取得エラー');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [slug, page, itemsPerPage]);

  /* ------------------------------ effects ------------------------- */
  useEffect(() => {
    setPage(1);
    fetchVideosByGenre();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 1) fetchVideosByGenre();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------ handlers ------------------------ */
  const handleVideoClick = (id: string | number) => navigate(`/video/${id}`);
  const handleSubGenreClick = (s: string) => navigate(`/genre/${s}`);
  const handleLoadMore = () => !loading && hasMore && setPage(p => p + 1);

  const handleSort = (key: keyof Video) => {
    const dir =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: dir });
  };

  /* ------------------------------ derived ------------------------- */
  const sortedVideos = useCallback((): Video[] => {
    if (!sortConfig) return videos;
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;

    return [...videos].sort((a, b) => {
      const av = a[key] as any;
      const bv = b[key] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;

      if (
        ['rating', 'review_count', 'view_count'].includes(key as string) &&
        !isNaN(Number(av)) &&
        !isNaN(Number(bv))
      )
        return dir * (Number(av) - Number(bv));

      if (key === 'published_at')
        return dir * (new Date(av).getTime() - new Date(bv).getTime());

      return dir * String(av).localeCompare(String(bv), 'ja');
    });
  }, [videos, sortConfig]);

  const filteredVideos = useCallback(() => {
    const list = sortedVideos();
    if (activeTab === 'all') return list;
    return list.filter(v => (activeTab === 'shorts' ? isShortVideo(v) : !isShortVideo(v)));
  }, [sortedVideos, activeTab, isShortVideo]);

  const totalShorts = videos.filter(isShortVideo).length;
  const totalNormal = videos.length - totalShorts;

  /* ------------------------------ UI helpers ---------------------- */
  const fmtView = (n?: number | string | null) => {
    if (n == null) return '-';
    const x = Number(n);
    if (isNaN(x) || x < 0) return '-';
    if (x >= 1e8) return `${(x / 1e8).toFixed(1)}億`;
    if (x >= 1e4) return `${(x / 1e4).toFixed(1)}万`;
    if (x >= 1e3) return `${(x / 1e3).toFixed(1)}K`;
    return x.toLocaleString();
  };
  const fmtDate = (s?: string | null) => {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const renderSortButtons = () => (
    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
      <span className="text-gray-500 dark:text-dark-text-secondary w-full mb-1">並び替え:</span>
      {(['title', 'rating', 'view_count', 'published_at'] as (keyof Video)[]).map(k => (
        <button
          key={k}
          onClick={() => handleSort(k)}
          className={`px-3 py-1 rounded-full border dark:border-dark-border flex items-center ${
            sortConfig?.key === k ? 'bg-indigo-600 text-white dark:bg-indigo-700'
                                  : 'bg-white dark:bg-dark-surface dark:text-dark-text-primary'}`}
        >
          {k === 'title' ? 'タイトル' : k === 'rating' ? '評価' : k === 'view_count' ? '再生回数' : '投稿日'}
          {sortConfig?.key === k &&
            (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 w-3 h-3" /> 
                                            : <ArrowDown className="ml-1 w-3 h-3" />)}
        </button>
      ))}
    </div>
  );

  /* ------------------------------ render -------------------------- */
  const showInitLoad = loading && page === 1 && videos.length === 0 && !error;
  const showEmpty    = !loading && videos.length === 0 && !error;
  const showLoadMore = !loading && hasMore && videos.length > 0;

  return (
    <div className="container mx-auto px-4 py-6 dark:bg-dark-bg">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ------------ Sidebar ------------ */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-4">
            <GenreSidebar
              activeGenre={currentGenreName}
              onSubGenreClick={handleSubGenreClick}
              parentGenreId={parentGenreId}
            />
          </div>
        </aside>

        {/* ------------ Main ------------ */}
        <div className="flex-grow">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden">
            {/* Title */}
            <h1 className="text-xl md:text-2xl font-bold p-4 dark:text-dark-text-primary">
              {currentGenreName ? `${currentGenreName}の動画一覧` : '動画一覧'}
            </h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-dark-border px-4">
              {([
                ['all', 'すべて', videos.length],
                ['normal', '通常動画', totalNormal],
                ['shorts', 'ショート', totalShorts],
              ] as ['all' | 'normal' | 'shorts', string, number][]).map(
                ([t, label, n]) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      activeTab === t
                        ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {label} ({n})
                  </button>
                )
              )}
            </div>

            {/* Loading / Error / Empty */}
            {showInitLoad && (
              <div className="flex justify-center items-center min-h-[200px] dark:bg-dark-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400" />
              </div>
            )}
            {error && (
              <div className="p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
                エラー: {error}
              </div>
            )}
            {showEmpty && (
              <div className="p-8 text-center text-gray-500 dark:text-dark-text-secondary">
                {activeTab === 'shorts'
                  ? 'このジャンルにはショート動画がありません。'
                  : activeTab === 'normal'
                  ? 'このジャンルには通常動画がありません。'
                  : '動画が見つかりませんでした。'}
              </div>
            )}

            {/* List */}
            {(!error || videos.length) && !showInitLoad && filteredVideos().length > 0 && (
              <>
                {isMobile && renderSortButtons()}
                {/* Mobile card */}
                {isMobile ? (
                  <div className="space-y-4 p-3 pb-4">
                    {filteredVideos().map(v => (
                      <div
                        key={v.id}
                        onClick={() => handleVideoClick(v.youtube_id || v.id)}
                        className="bg-white dark:bg-dark-surface rounded-lg shadow-sm hover:shadow-md dark:hover:shadow-lg dark:shadow-gray-900/30 transition-shadow cursor-pointer overflow-hidden border dark:border-dark-border"
                      >
                        <div className="flex p-2 border-b border-gray-100 dark:border-dark-border">
                          <div className="relative w-64 h-40 flex-shrink-0">
                            <img
                              src={v.thumbnail || '/placeholder.jpg'}
                              alt={v.title || 'No Title'}
                              className="w-full h-full object-cover rounded-sm"
                              loading="lazy"
                              onError={e => {
                                const t = e.currentTarget;
                                t.onerror = null;
                                t.src = '/placeholder.jpg';
                              }}
                            />
                            {isShortVideo(v) && (
                              <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 py-0.5 rounded-bl">
                                ショート
                              </div>
                            )}
                          </div>
                          <div className="flex-1 ml-2 overflow-hidden">
                            <p className="text-xs font-medium line-clamp-3 text-gray-900 dark:text-dark-text-primary">
                              {v.title || 'タイトルなし'}
                            </p>
                            {v.channel_title && (
                              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1 truncate">
                                {v.channel_title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between px-2 py-1 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-400 mr-1" />
                            <span>{v.rating ? v.rating.toFixed(1) : '-'}</span>
                          </div>
                          <div className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            <span>{fmtView(v.view_count)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{fmtDate(v.published_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Desktop table */
                  <Table>
                    <TableHeader className="dark:bg-gray-800">
                      <TableRow className="dark:border-dark-border">
                        {(
                          [
                            ['title', 'タイトル'],
                            ['rating', '★評価'],
                            ['review_count', 'レビュー数'],
                            ['channel_title', 'チャンネル'],
                            ['published_at', '投稿日'],
                            ['view_count', '再生回数'],
                          ] as [keyof Video, string][]
                        ).map(([k, lbl]) => (
                          <TableHead
                            key={k}
                            onClick={() => handleSort(k)}
                            className="cursor-pointer dark:text-dark-text-primary"
                          >
                            {lbl}{' '}
                            {sortConfig?.key === k
                              ? sortConfig.direction === 'asc'
                                ? '▲'
                                : '▼'
                              : ''}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVideos().map(v => (
                        <TableRow
                          key={v.id}
                          onClick={() => handleVideoClick(v.youtube_id || v.id)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-dark-border"
                        >
                          <TableCell className="flex items-center space-x-3 dark:text-dark-text-primary">
                            <div className="relative flex-shrink-0">
                              <img
                                src={v.thumbnail || '/placeholder.jpg'}
                                alt={v.title || 'No Title'}
                                className="w-48 h-auto rounded"
                                loading="lazy"
                                onError={e => {
                                  const t = e.currentTarget;
                                  t.onerror = null;
                                  t.src = '/placeholder.jpg';
                                }}
                              />
                              {isShortVideo(v) && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 py-0.5 rounded-bl">
                                  ショート
                                </div>
                              )}
                            </div>
                            <span className="flex-grow text-sm">{v.title || 'タイトルなし'}</span>
                          </TableCell>
                          <TableCell className="dark:text-dark-text-primary text-sm">
                            {v.rating ? v.rating.toFixed(1) : '-'}
                          </TableCell>
                          <TableCell className="dark:text-dark-text-primary text-sm">
                            {v.review_count?.toLocaleString() || '-'}
                          </TableCell>
                          <TableCell className="dark:text-dark-text-primary text-sm">
                            {v.channel_title && v.channel_id ? (
                              <a
                                href={`https://www.youtube.com/channel/${v.channel_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                {v.channel_title}
                              </a>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="dark:text-dark-text-primary text-sm">
                            {fmtDate(v.published_at)}
                          </TableCell>
                          <TableCell className="dark:text-dark-text-primary text-sm">
                            {fmtView(v.view_count)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}

            {/* Infinite loading spinner */}
            {loading && page > 1 && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
              </div>
            )}

            {/* LoadMore */}
            {showLoadMore && (
              <div className="text-center py-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-primary-500 dark:bg-primary-700 text-white rounded hover:bg-primary-600 dark:hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  さらに読み込む
                </button>
              </div>
            )}

            {!hasMore && !loading && videos.length > 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-dark-text-secondary">
                すべての動画を表示しました
              </div>
            )}
          </div>
        </div>

        {/* ------------ Ads ------------ */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-4">
            <AdsSection />
          </div>
        </aside>
      </div>
    </div>
  );
}
