import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, getUserVideoRating, getAllVideoRatings, updateVideoReviewCount } from '@/lib/supabase';
import type { Video, AggregatedVideoRating, VideoRating, RatingValue } from '@/types';
import VideoPlayer from './VideoPlayer';
import FavoriteButton from '../video/FavoriteButton';
import VideoRatingForm from './VideoRatingForm';

const defaultRatings: AggregatedVideoRating = {
    reliability: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    entertainment: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    usefulness: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    quality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    originality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    clarity: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    overall: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
};

// 評価項目のラベル
type RatingKey = keyof AggregatedVideoRating;

const ratingLabels: Record<RatingKey, string> = {
    reliability: '信頼性',
    entertainment: '面白さ',
    usefulness: '有用性',
    quality: '品質',
    originality: 'オリジナリティ',
    clarity: '分かりやすさ',
    overall: '総合評価'
};

// YouTubeの動画IDかどうかを確認する関数（一般的なYouTube IDは11文字）
const isValidYouTubeId = (id: string): boolean => {
    // 標準的なYouTube IDは11文字のアルファベットと数字、特殊文字
    return /^[a-zA-Z0-9_-]{11}$/.test(id);
};

// VideoDetail.tsx内の関数を修正
function convertReviewToVideoRating(review: any): VideoRating {
    // video_ratingsテーブルのデータの場合（現在はこのケースのみ）
    return {
        id: review.id || '',
        video_id: review.video_id || '',
        user_id: review.user_id || '',
        profiles: review.profiles || null,
        overall: Number(review.overall) || 0,
        clarity: Number(review.clarity) || 0,
        entertainment: Number(review.entertainment) || 0,
        originality: Number(review.originality) || 0,
        quality: Number(review.quality) || 0,
        reliability: Number(review.reliability) || 0,
        usefulness: Number(review.usefulness) || 0,
        comment: review.comment || ''
    };
}

// URLを自動リンク化する関数
const autoLinkText = (text: string): React.ReactNode => {
    if (!text) return '';

    // URLを検出する正規表現
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // テキストを分割してURLとそれ以外に分ける
    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];

    // 結果の配列
    const result: React.ReactNode[] = [];

    // パーツとマッチを組み合わせる
    parts.forEach((part, index) => {
        if (part) {
            result.push(<span key={`text-${index}`}>{part}</span>);
        }
        if (matches[index]) {
            result.push(
                <a
                    key={`link-${index}`}
                    href={matches[index]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {matches[index]}
                </a>
            );
        }
    });

    return result;
};

export default function VideoDetail() {
    const { videoId } = useParams();
    const [video, setVideo] = useState<Video | null>(null);
    const [userRating, setUserRating] = useState<VideoRating | null>(null);
    const [allRatings, setAllRatings] = useState<VideoRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        // ログイン状態を確認
        const checkAuth = async () => {
            const { data } = await supabase.auth.getSession();
            setIsLoggedIn(!!data.session);
            setCurrentUserId(data.session?.user?.id || null);
        };

        checkAuth();
    }, []);

    // VideoDetail.tsx のuseEffectに追加
    useEffect(() => {
        const ensureVideoExists = async () => {
            if (!videoId) return;

            // UUID形式のIDの場合は処理しない
            if (videoId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                console.log('UUID形式のIDなので処理をスキップします:', videoId);
                return;
            }

            try {
                // まず既存のデータを確認
                const { data: existingVideo } = await supabase
                    .from('videos')
                    .select('id')
                    .eq('youtube_id', videoId)
                    .maybeSingle();

                if (existingVideo) {
                    console.log('Video already exists in database:', existingVideo);
                    return;
                }

                // YouTubeの有効なIDかどうか確認
                if (!isValidYouTubeId(videoId)) {
                    console.error('Invalid YouTube ID format:', videoId);
                    setError('無効な動画IDです。正しいYouTube動画IDを使用してください。');
                    return;
                }

                // データが存在しない場合は追加
                console.log('Adding video to database:', videoId);

                // ダミーデータの挿入（実際にはYouTube APIから取得するのが理想）
                const { data: newVideo, error } = await supabase
                    .from('videos')
                    .insert([
                        {
                            youtube_id: videoId,
                            title: `YouTube Video ${videoId}`,
                            description: 'Description will be updated later',
                            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                            channel_title: 'YouTube Channel',
                            view_count: 0,
                            rating: 0,
                            published_at: new Date().toISOString()
                        }
                    ])
                    .select();

                if (error) {
                    console.error('Failed to add video to database:', error);
                } else {
                    console.log('Added video to database:', newVideo);
                    // データが追加されたら、ページをリロード
                    window.location.reload();
                }

            } catch (error) {
                console.error('Error ensuring video exists:', error);
            }
        };

        ensureVideoExists();
    }, [videoId]);

    const fetchVideoData = useCallback(async () => {
        if (!videoId) {
            console.error('No videoId provided');
            return null;
        }

        console.log('Attempting to fetch video with ID:', videoId);

        try {
            // まず単純なクエリでYouTube IDで検索（JOIN無し）
            const { data: youtubeIdVideo, error: youtubeError } = await supabase
                .from('videos')
                .select('*')
                .eq('youtube_id', videoId)
                .maybeSingle();

            if (youtubeError) {
                console.error('Error fetching by YouTube ID:', youtubeError);
            }

            if (youtubeIdVideo) {
                console.log('Found video by YouTube ID:', youtubeIdVideo);

                // youtuber情報を別クエリで取得（必要な場合）
                let youtuberInfo = null;
                if (youtubeIdVideo.youtuber_id) {
                    const { data: youtuberData } = await supabase
                        .from('youtubers')  // テーブル名は実際のものに合わせてください
                        .select('*')
                        .eq('id', youtubeIdVideo.youtuber_id)
                        .maybeSingle();

                    youtuberInfo = youtuberData;
                }

                return {
                    ...youtubeIdVideo,
                    youtube_id: youtubeIdVideo.youtube_id || videoId,
                    youtuber: youtuberInfo || {},
                    channel_id: youtuberInfo?.channel_id || ''
                } as Video;
            }

            // UUIDでも同様に検索
            if (videoId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                const { data: idVideo, error: idError } = await supabase
                    .from('videos')
                    .select('*')
                    .eq('id', videoId)
                    .maybeSingle();

                if (idError) {
                    console.error('Error fetching by UUID:', idError);
                }

                if (idVideo) {
                    console.log('Found video by UUID:', idVideo);

                    // YouTubeの有効なIDかチェック
                    if (!isValidYouTubeId(idVideo.youtube_id)) {
                        console.error('Invalid YouTube ID stored in database:', idVideo.youtube_id);
                        throw new Error('データベースに保存されている動画IDが無効です');
                    }

                    // youtuber情報を別クエリで取得（必要な場合）
                    let youtuberInfo = null;
                    if (idVideo.youtuber_id) {
                        const { data: youtuberData } = await supabase
                            .from('youtubers')  // テーブル名は実際のものに合わせてください
                            .select('*')
                            .eq('id', idVideo.youtuber_id)
                            .maybeSingle();

                        youtuberInfo = youtuberData;
                    }

                    return {
                        ...idVideo,
                        youtube_id: idVideo.youtube_id || videoId,
                        youtuber: youtuberInfo || {},
                        channel_id: youtuberInfo?.channel_id || ''
                    } as Video;
                }
            }

            // データベースにサンプルデータの確認
            const { data: sampleVideos } = await supabase
                .from('videos')
                .select('id, youtube_id, title')
                .limit(5);

            console.log('Sample videos in database:', sampleVideos);

            // YouTubeの動画IDでサンプルクエリを実行して確認
            const { data: specificYouTubeIdVideos } = await supabase
                .from('videos')
                .select('id, youtube_id, title')
                .ilike('youtube_id', `%${videoId.substring(0, 5)}%`)
                .limit(5);

            console.log(`Videos with YouTube ID like ${videoId.substring(0, 5)}:`, specificYouTubeIdVideos);

            // この時点で動画が見つからない場合、エラーをスローする
            console.error('No video found with ID:', videoId);
            throw new Error(`No video found for ID: ${videoId}`);

        } catch (error) {
            console.error('Video Fetch Error:', error);
            throw error;
        }
    }, [videoId]);

    // Videodetail.tsx の refreshData 関数内
    const refreshData = useCallback(async () => {
        if (!videoId) return;

        try {
            setLoading(true);

            // 動画データを取得
            const videoData = await fetchVideoData();
            if (!videoData) {
                throw new Error(`No video found for ID: ${videoId}`);
            }

            // 内部IDを使用してレビュー数を更新
            const internalVideoId = videoData.id;
            await updateVideoReviewCount(internalVideoId);

            // 内部IDを使用してユーザー評価とすべての評価を取得
            const [userRatingData, allRatingsData] = await Promise.all([
                getUserVideoRating(internalVideoId),
                getAllVideoRatings(internalVideoId)
            ]);

            // ログを追加
            console.log('Video ID (YouTube):', videoId);
            console.log('Video ID (Internal):', internalVideoId);
            console.log('Video Data:', videoData);
            console.log('User Rating Data:', userRatingData);
            console.log('All Ratings Data:', allRatingsData);

            // Review[] をVideoRating[]に変換してから集計
            const convertedRatings = (allRatingsData || []).map(convertReviewToVideoRating);
            console.log('Converted Ratings:', convertedRatings);

            // 動画の評価データを更新
            const updatedRatings = calculateAggregatedRatings(convertedRatings);
            console.log('Updated Ratings:', updatedRatings);

            videoData.ratings = updatedRatings;
            setVideo(videoData);
            setUserRating(userRatingData);
            setAllRatings(convertedRatings); // 変換後の VideoRating[] をセット

        } catch (err) {
            console.error('Error fetching video details:', err);
            setError('動画の読み込みに失敗しました。');
        } finally {
            setLoading(false);
        }
    }, [videoId, fetchVideoData]);

    // ここにuseEffectを追加して、コンポーネントマウント時やvideoIdが変わったときにデータを読み込む
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // 評価を集計する関数を追加
    function calculateAggregatedRatings(ratings: VideoRating[] | null): AggregatedVideoRating {
        const initialRatings: AggregatedVideoRating = {
            reliability: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            entertainment: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            usefulness: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            quality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            originality: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            clarity: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            overall: { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
        };

        if (!ratings || ratings.length === 0) return initialRatings;

        // デバッグ情報を追加
        console.log('Rating items before calculation:', ratings);

        const ratingKeys: (keyof AggregatedVideoRating)[] = [
            'reliability', 'entertainment', 'usefulness',
            'quality', 'originality', 'clarity', 'overall'
        ];

        ratingKeys.forEach(key => {
            // 各評価項目の値を集計
            const values = ratings.map(r => Number(r[key as keyof VideoRating]) || 0);
            console.log(`Values for ${key}:`, values);

            const validValues = values.filter(v => v > 0);
            const averageRating = validValues.length > 0
                ? validValues.reduce((a, b) => a + b, 0) / validValues.length
                : 0;

            initialRatings[key].averageRating = averageRating;
            initialRatings[key].totalRatings = validValues.length;

            // 分布の更新
            validValues.forEach(value => {
                if (value >= 1 && value <= 5) {
                    // 数値を RatingValue型 (1|2|3|4|5) にキャスト
                    const ratingValue = value as RatingValue;
                    initialRatings[key].distribution[ratingValue]++;
                }
            });
        });

        return initialRatings;
    }


    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="container mx-auto p-4 text-center">
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-600">{error || '動画が見つかりませんでした。'}</p>
                </div>
            </div>
        );
    }

    // ユーザーのレビューと他のレビューを分離
    const userRatingItem = allRatings.find(rating => rating.user_id === currentUserId);
    const otherRatings = allRatings.filter(rating => rating.user_id !== currentUserId);

    // 評価項目を左右の列に分割
    const leftColumns: RatingKey[] = ['reliability', 'entertainment', 'usefulness'];
    const rightColumns: RatingKey[] = ['quality', 'originality', 'clarity'];

    // 星評価を表示する関数
    const renderStars = (rating: number, max = 5) => {
        return (
            <div className="flex">
                {Array.from({ length: max }).map((_, index) => (
                    <span key={index} className="text-yellow-400">
                        {index < rating ? '★' : '☆'}
                    </span>
                ))}
            </div>
        );
    };

    // オブジェクトの型が確定した属性へのアクセスヘルパー
    const getRatingValue = (ratings: AggregatedVideoRating, key: RatingKey) => ratings[key];
    const getUserRatingValue = (rating: VideoRating, key: RatingKey) => {
        return Number(rating[key as keyof VideoRating]) || 0;
    };


    // 安全なレーティング取得関数を追加
    const getSafeRatings = (ratings: AggregatedVideoRating | undefined): AggregatedVideoRating => {
        return ratings || defaultRatings;
    };

    return (
        <div className="container mx-auto p-2 space-y-2" style={{ maxWidth: '1200px' }}>
            {/* 動画プレイヤーセクション */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* ここのネストされたdivを削除し、直接VideoPlayerを呼び出す */}
                <VideoPlayer
                    videoId={video.youtube_id}
                    width="100%"
                    height="100%"
                />

                {/* 動画情報ヘッダー - 余白を最小化 */}
                <div className="p-2" style={{ marginTop: 0, paddingTop: 0 }}>
                    <h1 className="text-2xl font-bold mb-1">{video.title}</h1>

                    <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-4 text-gray-600">
        <span>{video.view_count?.toLocaleString() || 0} 回視聴</span>
        <span>投稿日: {new Date(video.published_at).toLocaleDateString()}</span>
    </div>
    {/* ボタンを別の要素として配置 */}
    <FavoriteButton videoId={video.id} />
</div>


                    {/* チャンネル情報とジャンル */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <a
                                href={`https://www.youtube.com/channel/${video.channel_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 hover:text-indigo-600"
                            >
                                <img
                                    src={`https://www.youtube.com/channel/${video.channel_id}/picture`}
                                    alt={video.channel_title}
                                    className="w-12 h-12 rounded-full"
                                    onError={(e) => {
                                        e.currentTarget.src = '/default-avatar.jpg';
                                    }}
                                />
                                <div>
                                    <h2 className="font-medium">{video.channel_title}</h2>
                                    <span className="text-sm text-gray-600">{video.genre_id}</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* 動画説明 */}
                    <div className="mt-1">
                        <div>
                            <div className={`text-gray-700 whitespace-pre-wrap ${
                                !isDescriptionExpanded ? 'line-clamp-2' : ''
                                }`}>
                                {isDescriptionExpanded
                                    ? autoLinkText(video.description)
                                    : autoLinkText(video.description.slice(0, 150) + '...')}
                            </div>
                            {video.description.length > 150 && (
                                <button
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    className="text-indigo-600 hover:text-indigo-800 mt-1 text-sm font-medium"
                                >
                                    {isDescriptionExpanded ? '閉じる' : '続きを見る'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 評価セクション全体をグリッドレイアウトにする */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 左側カラム */}
                <div>
                    {/* 総合評価セクション */}
                    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                        <h2 className="text-xl font-bold mb-4">総合評価</h2>

                        {/* 評価項目を2列で表示 */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* 左列 */}
                            <div>
                                {leftColumns.map(key => {
                                    const ratings = getSafeRatings(video.ratings);
                                    const rating = getRatingValue(ratings, key);
                                    return (
                                        <div key={key} className="flex items-center justify-between mb-2">
                                            <span className="text-gray-700">{ratingLabels[key]}</span>
                                            <div className="flex items-center">
                                                <div className="flex mr-2">
                                                    {renderStars(Math.round(rating.averageRating || 0))}
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    {(rating.averageRating || 0).toFixed(1)} ({rating.totalRatings || 0}件)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 右列 */}
                            <div>
                                {rightColumns.map(key => {
                                    const ratings = getSafeRatings(video.ratings);
                                    const rating = getRatingValue(ratings, key);
                                    return (
                                        <div key={key} className="flex items-center justify-between mb-2">
                                            <span className="text-gray-700">{ratingLabels[key]}</span>
                                            <div className="flex items-center">
                                                <div className="flex mr-2">
                                                    {renderStars(Math.round(rating.averageRating || 0))}
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    {(rating.averageRating || 0).toFixed(1)} ({rating.totalRatings || 0}件)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 総合評価の表示 */}
                        <div className="border-t pt-3 mt-3">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">総合評価</span>
                                <div className="flex items-center">
                                    <div className="flex mr-2">
                                        {renderStars(Math.round(getSafeRatings(video.ratings).overall.averageRating || 0))}
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {(getSafeRatings(video.ratings).overall.averageRating || 0).toFixed(1)} ({getSafeRatings(video.ratings).overall.totalRatings || 0}件)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* あなたの評価セクション - ログインしている場合のみ表示 */}
                    {isLoggedIn && userRatingItem && (
                        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                            <h2 className="text-xl font-bold mb-4">あなたの評価</h2>
                            <div>
                                {/* 評価項目を2列で表示 */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {/* 左列 */}
                                    <div>
                                        {leftColumns.map(key => (
                                            <div key={key} className="mb-2">
                                                <p className="text-sm text-gray-500">{ratingLabels[key]}</p>
                                                <div className="flex">
                                                    {renderStars(getUserRatingValue(userRatingItem, key))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 右列 */}
                                    <div>
                                        {rightColumns.map(key => (
                                            <div key={key} className="mb-2">
                                                <p className="text-sm text-gray-500">{ratingLabels[key]}</p>
                                                <div className="flex">
                                                    {renderStars(getUserRatingValue(userRatingItem, key))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-3 text-gray-700">{userRatingItem.comment}</div>
                            </div>
                        </div>
                    )}

                    {/* 全ての評価セクション - 他のユーザーの評価がある場合のみ表示 */}
                    {otherRatings.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h2 className="text-xl font-bold mb-4">全ての評価</h2>
                            {otherRatings.map((rating) => (
                                <div key={rating.id} className="border-b pb-3 mb-3">
                                    <div className="flex items-center mb-2">
                                        <img
                                            src={rating.profiles?.avatar_url || '/default-avatar.jpg'}
                                            alt="User"
                                            className="w-8 h-8 rounded-full mr-2"
                                        />
                                        <span className="font-medium">{rating.profiles?.username || 'ユーザー'}</span>
                                    </div>

                                    {/* 評価項目を2列で表示 */}
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        {/* 左列 */}
                                        <div>
                                            {leftColumns.map(key => (
                                                <div key={key} className="mb-2">
                                                    <p className="text-sm text-gray-500">{ratingLabels[key]}</p>
                                                    <div className="flex">
                                                        {renderStars(getUserRatingValue(rating, key))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 右列 */}
                                        <div>
                                            {rightColumns.map(key => (
                                                <div key={key} className="mb-2">
                                                    <p className="text-sm text-gray-500">{ratingLabels[key]}</p>
                                                    <div className="flex">
                                                        {renderStars(getUserRatingValue(rating, key))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-gray-700 mt-2">{rating.comment}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 右側カラム */}
                <div>
                    {/* 評価フォーム - ログインしている場合のみ表示 */}
                    {isLoggedIn && (
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h2 className="text-xl font-bold mb-4">評価を投稿</h2>
                            <VideoRatingForm
                                videoId={video.id}
                                onSubmit={async () => {
                                    await refreshData();
                                }}
                                initialRatings={userRating || undefined}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}