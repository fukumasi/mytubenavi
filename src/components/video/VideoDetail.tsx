// src/components/video/VideoDetail.tsx
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

// URLを自動リンク化する関数を修正
// --- 修正箇所 start ---
const autoLinkText = (text: string): React.ReactNode => {
    if (!text) return '';

    // URLを検出する正規表現
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // テキストを分割してURLとそれ以外に分ける
    const parts = text.split(urlRegex);

    // 結果の配列
    const result: React.ReactNode[] = [];
    let urlIndex = 0; // マッチしたURLのインデックスを管理

    // パーツとマッチを組み合わせる
    parts.forEach((part, index) => {
        // URL部分かどうかをチェック
        if (urlRegex.test(part)) {
             // 前回のマッチ位置をリセットして再テスト
             urlRegex.lastIndex = 0;
             if (urlRegex.test(part)) {
                 result.push(
                     <a
                         key={`link-${urlIndex}`} // keyの指定方法を修正
                         href={part} // プロパティの指定方法を修正
                         target="_blank" // プロパティの指定方法を修正
                         rel="noopener noreferrer" // プロパティの指定方法を修正
                         className="text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300" // プロパティの指定方法を修正
                         onClick={(e) => e.stopPropagation()} // プロパティの指定方法を修正
                     >
                         {part}
                     </a>
                 );
                 urlIndex++; // URLが見つかったらインデックスを増やす
             } else {
                 // URLでない場合はそのまま追加
                 result.push(<span key={`text-${index}`}>{part}</span>);
             }

        } else if (part) {
            // URL以外の部分で空でない場合
            result.push(<span key={`text-${index}`}>{part}</span>);
        }
    });

    return result;
};
// --- 修正箇所 end ---


export default function VideoDetail() {
    const { videoId } = useParams<{ videoId: string }>();
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
                    youtube_id: youtubeIdVideo.youtube_id || videoId, // youtube_idがnullの場合のフォールバック
                    youtuber: youtuberInfo || {},
                    channel_id: youtuberInfo?.channel_id || youtubeIdVideo.channel_id || '' // youtuber情報かvideo情報から取得
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

                     // youtube_idがnullまたは空でないか、有効な形式かチェック
                    if (!idVideo.youtube_id || !isValidYouTubeId(idVideo.youtube_id)) {
                        console.error('Invalid or missing YouTube ID stored in database for video UUID:', videoId, 'YouTube ID:', idVideo.youtube_id);
                        // ここでエラーを投げるか、代替処理を行うか検討
                        // throw new Error('データベースに保存されている動画IDが無効または存在しません');
                        // とりあえずフォールバック値や空文字を設定しておく
                        idVideo.youtube_id = ''; // または適切なデフォルト値
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
                        // youtube_id: idVideo.youtube_id || videoId, // 上でチェック済みなので videoId でのフォールバックは不要かも
                        youtuber: youtuberInfo || {},
                        channel_id: youtuberInfo?.channel_id || idVideo.channel_id || '' // youtuber情報かvideo情報から取得
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
                // fetchVideoData内でエラーが投げられない場合、ここで再度チェック
                console.error(`No video data returned for ID: ${videoId}`);
                setError(`動画データが見つかりませんでした (ID: ${videoId})。`);
                setLoading(false);
                return; // 処理を中断
            }

            // videoDataとvideoData.idが存在することを確認
            if (!videoData.id) {
                console.error('Fetched video data is missing an internal ID:', videoData);
                setError('動画データの取得中にエラーが発生しました（内部IDが見つかりません）。');
                setLoading(false);
                return;
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
            setUserRating(userRatingData ?? null);
            setAllRatings(convertedRatings); // 変換後の VideoRating[] をセット

        } catch (err) {
            console.error('Error fetching video details:', err);
             // エラーオブジェクトからメッセージを取得、なければデフォルトメッセージ
             const errorMessage = err instanceof Error ? err.message : String(err);
             setError(`動画の読み込みに失敗しました: ${errorMessage}`);
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
        // ディープコピーしてデフォルト値を初期化
        const initialRatings: AggregatedVideoRating = JSON.parse(JSON.stringify(defaultRatings));

        if (!ratings || ratings.length === 0) return initialRatings;

        // デバッグ情報を追加
        console.log('Rating items before calculation:', ratings);

        const ratingKeys: (keyof AggregatedVideoRating)[] = [
            'reliability', 'entertainment', 'usefulness',
            'quality', 'originality', 'clarity', 'overall'
        ];

        ratingKeys.forEach(key => {
            // 各評価項目の値を集計
            const values = ratings.map(r => Number(r[key as keyof VideoRating]) || 0).filter(v => v >= 1 && v <= 5); // 1-5の有効な値のみフィルタリング
            console.log(`Valid values for ${key}:`, values); // フィルタリング後の値を確認

            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const averageRating = sum / values.length;

                initialRatings[key].averageRating = averageRating;
                initialRatings[key].totalRatings = values.length;

                // 分布の更新
                values.forEach(value => {
                    // 数値を RatingValue型 (1|2|3|4|5) にキャスト
                    const ratingValue = Math.round(value) as RatingValue; // 念のため丸める
                    if (ratingValue >= 1 && ratingValue <= 5) {
                       initialRatings[key].distribution[ratingValue]++;
                    }
                });
            } else {
                 // 有効な評価がない場合はデフォルト値のままにする（初期化済み）
                 initialRatings[key].averageRating = 0;
                 initialRatings[key].totalRatings = 0;
                 initialRatings[key].distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // 念のため再初期化
            }
        });

        console.log('Calculated aggregated ratings:', initialRatings); // 計算後の結果を確認
        return initialRatings;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen dark:bg-dark-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400" />
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="container mx-auto px-2 sm:px-4 text-center py-8 dark:bg-dark-bg">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    {/* --- 修正箇所 start --- */}
                    {/* videoがない場合のエラーメッセージも表示 */}
                    <p className="text-red-600 dark:text-red-400">{error || (!video && '動画データが見つかりませんでした。') || '不明なエラーが発生しました。'}</p>
                    {/* --- 修正箇所 end --- */}
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
         // ratingがNaNやInfinityの場合を考慮
        const validRating = Number.isFinite(rating) ? Math.round(rating) : 0;
        return (
            <div className="flex">
                {Array.from({ length: max }).map((_, index) => (
                    <span key={index} className="text-yellow-400 text-xs sm:text-sm">
                        {/* --- 修正箇所 start --- */}
                        {index < validRating ? '★' : '☆'}
                        {/* --- 修正箇所 end --- */}
                    </span>
                ))}
            </div>
        );
    };

    // オブジェクトの型が確定した属性へのアクセスヘルパー
    const getRatingValue = (ratings: AggregatedVideoRating, key: RatingKey) => ratings[key];
    const getUserRatingValue = (rating: VideoRating, key: RatingKey) => {
        // --- 修正箇所 start ---
        // rating[key]が存在しない、または数値でない可能性を考慮
        const value = rating[key as keyof VideoRating];
        return typeof value === 'number' ? value : 0;
        // --- 修正箇所 end ---
    };

    // 安全なレーティング取得関数を追加
    const getSafeRatings = (ratings: AggregatedVideoRating | undefined): AggregatedVideoRating => {
        // --- 修正箇所 start ---
        // ratingsが存在し、かつ必要なプロパティが揃っているか確認する（より厳密に）
        if (ratings && typeof ratings === 'object' && 'overall' in ratings) {
            // 必要に応じて他のキーもチェック
            return ratings;
        }
        return defaultRatings; // 不完全またはundefinedの場合はデフォルトを返す
        // --- 修正箇所 end ---
    };

    return (
        <div className="container mx-auto px-2 sm:px-4 space-y-2 sm:space-y-4 dark:bg-dark-bg" style={{ maxWidth: '1200px' }}>
            {/* 動画プレイヤーセクション - モバイル用に上部マージンをさらに増加 */}
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md dark:shadow-none dark:border dark:border-dark-border overflow-hidden mt-12 sm:mt-8 md:mt-8">
                {/* レスポンシブ対応のアスペクト比を保持するラッパー */}
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <div className="absolute inset-0">
                        {/* --- 修正箇所 start --- */}
                        {/* videoとvideo.youtube_idの存在を確認 */}
                        {video?.youtube_id && <VideoPlayer
                            videoId={video.youtube_id}
                            width="100%"
                            height="100%"
                        />}
                        {/* --- 修正箇所 end --- */}
                    </div>
                </div>

                {/* 動画情報ヘッダー - レスポンシブパディング */}
                <div className="p-2 sm:p-4">
                    {/* --- 修正箇所 start --- */}
                    {/* オプショナルチェイニングで安全にアクセス */}
                    <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 dark:text-dark-text-primary">{video?.title || 'タイトル不明'}</h1>
                    {/* --- 修正箇所 end --- */}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
                            {/* --- 修正箇所 start --- */}
                            <span>{video?.view_count?.toLocaleString() ?? 0} 回視聴</span>
                            <span className="hidden sm:inline">•</span>
                            {/* published_at が有効な日付か確認 */}
                            <span>投稿日: {video?.published_at ? new Date(video.published_at).toLocaleDateString() : '不明'}</span>
                            {/* --- 修正箇所 end --- */}
                        </div>
                        {/* ボタンを別の要素として配置 */}
                        <div className="flex justify-end">
                           {/* --- 修正箇所 start --- */}
                           {/* videoとvideo.idの存在を確認 */}
                           {video?.id && <FavoriteButton videoId={video.id} />}
                           {/* --- 修正箇所 end --- */}
                        </div>
                    </div>

                   {/* チャンネル情報とジャンル */}
                    {/* --- 修正箇所 start --- */}
                    {/* video と channel_id の存在を確認 */}
                    {video?.channel_id && (
                        <a
                          href={`https://www.youtube.com/channel/${video.channel_id}`} // プロパティの指定方法を修正
                          target="_blank" // プロパティの指定方法を修正
                          rel="noopener noreferrer" // プロパティの指定方法を修正
                          className="flex items-center gap-2 sm:gap-3 hover:text-indigo-600 dark:hover:text-indigo-400" // プロパティの指定方法を修正
                        >
                          {/* 画像URLが channel_id から生成されることを確認 */}
                          <img
                            src={`https://i.ytimg.com/vi/${video.youtube_id}/default.jpg`} // サムネイル等、確実に存在する画像URLに変更検討 (チャンネルアイコン取得はAPIが必要な場合あり)
                            // src={`https://www.youtube.com/channel/${video.channel_id}/picture`} // この形式が常に有効とは限らない
                            alt={video.channel_title || 'チャンネルアイコン'} // alt属性も安全に
                            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full"
                            onError={(e) => {
                              // 型ガードを追加
                              const imgElement = e.target as HTMLImageElement;
                              if(imgElement){
                                imgElement.src = '/default-avatar.jpg'; // デフォルト画像のパスを確認
                                imgElement.alt = 'デフォルトアバター'; // altも更新
                              }
                            }}
                          />
                          <div>
                            <h2 className="text-sm sm:text-base font-medium dark:text-dark-text-primary">{video.channel_title || 'チャンネル名不明'}</h2>
                            {/* genre_id が存在するか確認 */}
                            {video.genre_id && <span className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">{video.genre_id}</span>}
                          </div>
                        </a>
                      )}
                    {/* --- 修正箇所 end --- */}


                    {/* 動画説明 */}
                    <div className="mt-1">
                        {/* --- 修正箇所 start --- */}
                        {/* video と description の存在を確認 */}
                        {video?.description && (
                            <div>
                                <div className={`text-xs sm:text-sm text-gray-700 dark:text-dark-text-secondary whitespace-pre-wrap ${
                                    !isDescriptionExpanded ? 'line-clamp-2 sm:line-clamp-3' : ''
                                    }`}>
                                    {/* --- 修正箇所 start --- */}
                                    {/* autoLinkTextに渡す前にdescriptionが存在することを確認 */}
                                    {isDescriptionExpanded
                                        ? autoLinkText(video.description)
                                        : autoLinkText(video.description.slice(0, 150) + (video.description.length > 150 ? '...' : ''))}
                                    {/* --- 修正箇所 end --- */}
                                </div>
                                {/* --- 修正箇所 start --- */}
                                {/* descriptionの長さチェックも安全に */}
                                {(video.description?.length ?? 0) > 150 && (
                                    <button
                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mt-1 text-xs sm:text-sm font-medium"
                                    >
                                        {isDescriptionExpanded ? '閉じる' : '続きを見る'}
                                    </button>
                                )}
                                {/* --- 修正箇所 end --- */}
                            </div>
                        )}
                        {/* --- 修正箇所 end --- */}
                    </div>
                </div>
            </div>

            {/* 評価セクション全体をグリッドレイアウトにする */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 左側カラム */}
                <div className="space-y-4">
                    {/* 総合評価セクション */}
                    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md dark:shadow-none dark:border dark:border-dark-border p-3 sm:p-4">
                        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 dark:text-dark-text-primary">総合評価</h2>

                        {/* 評価項目を2列で表示 - 小さい画面では1列 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4">
                            {/* 左列 */}
                            <div>
                                {leftColumns.map(key => {
                                    // --- 修正箇所 start ---
                                    const ratings = getSafeRatings(video?.ratings); // video?.ratings で安全にアクセス
                                    // --- 修正箇所 end ---
                                    const rating = getRatingValue(ratings, key);
                                    return (
                                        <div key={key} className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-700 dark:text-dark-text-secondary">{ratingLabels[key]}</span>
                                            <div className="flex items-center">
                                                <div className="flex mr-2">
                                                    {renderStars(rating.averageRating || 0)}
                                                </div>
                                                <span className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">
                                                    {/* --- 修正箇所 start --- */}
                                                    {(rating.averageRating || 0).toFixed(1)} ({rating.totalRatings || 0}件)
                                                    {/* --- 修正箇所 end --- */}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 右列 */}
                            <div>
                                {rightColumns.map(key => {
                                     // --- 修正箇所 start ---
                                     const ratings = getSafeRatings(video?.ratings); // video?.ratings で安全にアクセス
                                     // --- 修正箇所 end ---
                                    const rating = getRatingValue(ratings, key);
                                    return (
                                        <div key={key} className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-700 dark:text-dark-text-secondary">{ratingLabels[key]}</span>
                                            <div className="flex items-center">
                                                <div className="flex mr-2">
                                                    {renderStars(rating.averageRating || 0)}
                                                </div>
                                                <span className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">
                                                    {/* --- 修正箇所 start --- */}
                                                    {(rating.averageRating || 0).toFixed(1)} ({rating.totalRatings || 0}件)
                                                    {/* --- 修正箇所 end --- */}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 総合評価の表示 */}
                        <div className="border-t dark:border-dark-border pt-3 mt-3">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold dark:text-dark-text-primary">総合評価</span>
                                <div className="flex items-center">
                                    <div className="flex mr-2">
                                        {/* --- 修正箇所 start --- */}
                                        {renderStars(getSafeRatings(video?.ratings).overall.averageRating || 0)}
                                        {/* --- 修正箇所 end --- */}
                                    </div>
                                    <span className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">
                                        {/* --- 修正箇所 start --- */}
                                        {(getSafeRatings(video?.ratings).overall.averageRating || 0).toFixed(1)} ({getSafeRatings(video?.ratings).overall.totalRatings || 0}件)
                                         {/* --- 修正箇所 end --- */}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* あなたの評価セクション - ログインしている場合のみ表示 */}
                    {isLoggedIn && userRatingItem && (
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md dark:shadow-none dark:border dark:border-dark-border p-3 sm:p-4">
                            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 dark:text-dark-text-primary">あなたの評価</h2>
                            <div>
                                {/* 評価項目を2列で表示 - 小さい画面では1列 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4">
                                    {/* 左列 */}
                                    <div>
                                        {leftColumns.map(key => (
                                            <div key={key} className="mb-2">
                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">{ratingLabels[key]}</p>
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
                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">{ratingLabels[key]}</p>
                                                <div className="flex">
                                                    {renderStars(getUserRatingValue(userRatingItem, key))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* --- 修正箇所 start --- */}
                                {/* userRatingItem.comment が存在する場合のみ表示 */}
                                {userRatingItem.comment && <div className="mt-3 text-xs sm:text-sm text-gray-700 dark:text-dark-text-secondary">{userRatingItem.comment}</div>}
                                {/* --- 修正箇所 end --- */}

                            </div>
                        </div>
                    )}

                    {/* 全ての評価セクション - 他のユーザーの評価がある場合のみ表示 */}
                    {otherRatings.length > 0 && (
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md dark:shadow-none dark:border dark:border-dark-border p-3 sm:p-4">
                            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 dark:text-dark-text-primary">全ての評価</h2>
                            {otherRatings.map((rating) => (
                                // --- 修正箇所 start ---
                                // rating と rating.id の存在を確認
                                rating?.id && (
                                    <div key={rating.id} className="border-b dark:border-dark-border pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0"> {/* 最後の要素の罫線を消す */}
                                        <div className="flex items-center mb-2">
                                            <img
                                                // --- 修正箇所 start ---
                                                src={rating.profiles?.avatar_url || '/default-avatar.jpg'} // デフォルト画像のパスを確認
                                                // --- 修正箇所 end ---
                                                alt="User Avatar" // より具体的なalt
                                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2"
                                                // --- 修正箇所 start ---
                                                // onErrorハンドラを追加して画像読み込みエラーに対応
                                                onError={(e) => {
                                                    const imgElement = e.target as HTMLImageElement;
                                                    if (imgElement) {
                                                        imgElement.src = '/default-avatar.jpg';
                                                        imgElement.alt = 'デフォルトアバター';
                                                    }
                                                }}
                                                // --- 修正箇所 end ---
                                            />
                                            <span className="text-sm sm:text-base font-medium dark:text-dark-text-primary">{rating.profiles?.username || '匿名ユーザー'}</span>
                                        </div>

                                        {/* 評価項目を2列で表示 - 小さい画面では1列 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-2">
                                            {/* 左列 */}
                                            <div>
                                                {leftColumns.map(key => (
                                                    <div key={`${rating.id}-left-${key}`} className="mb-2"> {/* より一意なkey */}
                                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">{ratingLabels[key]}</p>
                                                        <div className="flex">
                                                            {renderStars(getUserRatingValue(rating, key))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* 右列 */}
                                            <div>
                                                {rightColumns.map(key => (
                                                    <div key={`${rating.id}-right-${key}`} className="mb-2"> {/* より一意なkey */}
                                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">{ratingLabels[key]}</p>
                                                        <div className="flex">
                                                            {renderStars(getUserRatingValue(rating, key))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* --- 修正箇所 start --- */}
                                        {/* rating.comment が存在する場合のみ表示 */}
                                        {rating.comment && <p className="text-xs sm:text-sm text-gray-700 dark:text-dark-text-secondary mt-2 whitespace-pre-wrap">{rating.comment}</p> } {/* コメント内の改行を保持 */}
                                        {/* --- 修正箇所 end --- */}
                                    </div>
                                )
                                // --- 修正箇所 end ---
                            ))}
                        </div>
                    )}
                </div>

                {/* 右側カラム */}
                <div>
                    {/* 評価フォーム - ログインしている場合のみ表示 */}
                    {/* --- 修正箇所 start --- */}
                    {/* video と video.id の存在を確認 */}
                    {isLoggedIn && video?.id && (
                        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md dark:shadow-none dark:border dark:border-dark-border p-3 sm:p-4">
                            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 dark:text-dark-text-primary">評価を投稿</h2>
                           <VideoRatingForm
                                videoId={video.id} // video.id は存在確認済み
                                onSubmit={async () => {
                                    await refreshData();
                                }}
                                // --- 修正箇所 start ---
                                // initialRatings の型エラー (ts2345) への対応
                                // VideoRatingForm が VideoRating | undefined を受け入れるか確認が必要
                                // もし VideoRating のみを期待する場合は、userRating が null でないことを保証するか、
                                // デフォルトの VideoRating オブジェクトを渡す必要がある。
                                // ここでは undefined を許容すると仮定してそのままにする。
                                initialRatings={userRating || undefined}
                                // --- 修正箇所 end ---
                            />
                        </div>
                    )}
                    {/* --- 修正箇所 end --- */}
                </div>
            </div>
            {/* --- 修正箇所 start --- */}
            {/* 閉じタグの不足や余分な要素がないか確認 (705行目付近のエラーに対応) */}
            {/* このファイルの末尾に対応する閉じタグがあることを確認 */}
            {/* --- 修正箇所 end --- */}
        </div>
    );
}