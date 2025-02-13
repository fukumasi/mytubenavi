import { useState, useEffect } from 'react';
import {
   BarChart2,
   Users,
   MessageCircle,
   Settings,
   Upload,
   Trash2,
   Eye,
   Star,
   DollarSign,
   Video,
   Youtube,
   AlertCircle,
   RefreshCcw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PromotionSlots from './PromotionSlots';
import { useAuth } from '../../contexts/AuthContext';
import {
   getProfile,
   getRecentVideos,
   addVideoToDatabase,
   getChannelStats,
   publishVideo,
   deleteVideo
} from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { Profile, Video as VideoType, ChannelStats } from '../../types';
import { useYoutuberSync } from '../../hooks/useYoutuberSync';

const supabase = createClient(
   import.meta.env.VITE_SUPABASE_URL, 
   import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Dashboard() {
   const { currentUser } = useAuth();
   const [activeTab, setActiveTab] = useState('overview');
   const [profile, setProfile] = useState<Profile | null>(null);
   const [recentVideos, setRecentVideos] = useState<VideoType[]>([]);
   const [videoUrl, setVideoUrl] = useState('');
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [stats, setStats] = useState<ChannelStats>({
       totalViews: 0,
       totalSubscribers: 0,
       averageRating: 0,
       totalVideos: 0,
       publishedVideos: 0,
       draftVideos: 0,
       viewsGrowth: 0,
       subscribersGrowth: 0,
       viewsData: [],
       subscribersData: []
   });
   const [youtuberProfile, setYoutuberProfile] = useState<any>(null);

   const { syncChannel, resyncChannel, syncStatus } = useYoutuberSync();
   const isSyncing = ['syncing', 'loading'].includes(syncStatus.status);

   useEffect(() => {
       const fetchData = async () => {
           if (!currentUser?.id) return;
           setLoading(true);
           setError(null);

           try {
               const [userProfile, recentVids, channelStats] = await Promise.all([
                   getProfile(),
                   getRecentVideos(),
                   getChannelStats(currentUser.id)
               ]);

               setProfile(userProfile);
               setRecentVideos(recentVids);
               setStats(channelStats);
               
               const { data } = await supabase
                   .from('youtuber_profiles')
                   .select('*')
                   .eq('id', currentUser.id)
                   .single();

               setYoutuberProfile(data);

           } catch (err) {
               console.error('Error fetching dashboard data:', err);
               setError('データの取得に失敗しました');
           } finally {
               setLoading(false);
           }
       };

       fetchData();
   }, [currentUser]);



    // handleAddVideo関数を修正
    const handleAddVideo = async () => {
        if (!videoUrl) return;

        try {
            setLoading(true);
            // 動画同期処理を追加
            await syncChannel(videoUrl); // YouTubeとの同期
            await addVideoToDatabase(videoUrl); // Supabaseへの追加
            const recentVids = await getRecentVideos();
            setRecentVideos(recentVids);
            setVideoUrl('');
        } catch (err) {
            console.error('Error adding video:', err);
            setError('動画の追加に失敗しました');
        } finally {
            setLoading(false);
        }
    };


    // handleResync関数を修正
    const handleResync = async (videoId: string) => {
        try {
            setLoading(true);
            await resyncChannel(videoId);
            const recentVids = await getRecentVideos();
            setRecentVideos(recentVids);
        } catch (err) {
            console.error('Error resyncing video:', err);
            setError('動画の再同期に失敗しました');
        } finally {
            setLoading(false);
        }
    };


    const handlePublishVideo = async (videoId: string) => {
        try {
            setLoading(true);
            await publishVideo(videoId);
            const recentVids = await getRecentVideos();
            setRecentVideos(recentVids);
        } catch (err) {
            console.error('Error publishing video:', err);
            setError('動画の公開に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!window.confirm('この動画を削除してもよろしいですか？')) return;

        try {
            setLoading(true);
            await deleteVideo(videoId);
            const recentVids = await getRecentVideos();
            setRecentVideos(recentVids);
        } catch (err) {
            console.error('Error deleting video:', err);
            setError('動画の削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const renderStatsCard = (
        title: string,
        value: string | number,
        trend: string | number,
        icon: React.ReactNode,
        trendColor: string = 'text-green-600'
    ) => (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                    <p className={`text-sm ${trendColor} mt-1`}>{trend}</p>
                </div>
                {icon}
            </div>
        </div>
    );

    const renderOverview = () => (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {error}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderStatsCard(
                    '総視聴回数',
                    stats.totalViews || '--',
                    `${stats.viewsGrowth > 0 ? '+' : ''}${stats.viewsGrowth?.toFixed(1) || '0'}% 先月比`,
                    <Eye className="h-8 w-8 text-indigo-600" />
                )}
                {renderStatsCard(
                    'チャンネル登録者',
                    stats.totalSubscribers || '--',
                    `${stats.subscribersGrowth > 0 ? '+' : ''}${stats.subscribersGrowth?.toFixed(1) || '0'}% 先週比`,
                    <Users className="h-8 w-8 text-green-600" />
                )}
                {renderStatsCard(
                    '平均評価',
                    stats.averageRating?.toFixed(1) || '--',
                    `エンゲージメント ${((stats.totalViews || 0) / 1000).toFixed(1)}k`,
                    <Star className="h-8 w-8 text-yellow-500" />
                )}
                {renderStatsCard(
                    '総動画数',
                    stats.totalVideos || '--',
                    `公開済み ${stats.publishedVideos || '--'} / 下書き ${stats.draftVideos || '--'}`,
                    <Video className="h-8 w-8 text-red-600" />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">視聴回数の推移</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.viewsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('ja-JP')}
                                />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#4F46E5"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">登録者数の推移</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.subscribersData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('ja-JP')}
                                />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="subscribers"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 最近の動画セクション */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium text-gray-900">最近の動画</h2>
                        <div className="flex items-center">
                            <input
                                type="text"
                                placeholder="Youtube動画のURLを入力"
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mr-2"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                            />
                            <button
                                onClick={handleAddVideo}
                                disabled={loading || !videoUrl || isSyncing} // loading, videoUrl, isSyncing をチェック
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {isSyncing ? '同期中...' : '動画を追加'} {/* isSyncing に応じて表示変更 */}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {recentVideos.map((video) => (
                        <div key={video.id} className="p-6 flex items-start space-x-4">
                            <div className="relative flex-shrink-0 w-48">
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-27 object-cover rounded-lg"
                                />
                                <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${video.publishedAt
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {video.publishedAt ? '公開中' : '下書き'}
                                </span>
                            </div>

                            <div className="flex-grow">
                                <h3 className="text-sm font-medium text-gray-900">{video.title}</h3>
                                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                                    <div className="flex items-center">
                                        <Eye className="h-4 w-4 mr-1" />
                                        {video.viewCount?.toLocaleString()}
                                    </div>
                                    <div className="flex items-center">
                                        <Star className="h-4 w-4 mr-1 text-yellow-400" />
                                        {video.rating?.toFixed(1)}
                                    </div>
                                    <span>{new Date(video.publishedAt).toLocaleDateString('ja-JP')}</span>
                                </div>

                                {/* 動画カードのJSXに再同期ボタンを追加 */}
                                <div className="mt-2 flex items-center space-x-2">
                                    <button
                                        onClick={() => window.open(`https://youtube.com/watch?v=${video.id}`, '_blank')}
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        プレビュー
                                    </button>
                                    {/* 再同期ボタン */}
                                    <button
                                        onClick={() => handleResync(video.id)}
                                        disabled={isSyncing} // isSyncing が true のときに disabled
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                         <RefreshCcw className="h-4 w-4 mr-1" /> {/* アイコン追加 */}
                                        再同期
                                    </button>
                                    {!video.publishedAt && (
                                        <button
                                            onClick={() => handlePublishVideo(video.id)}
                                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            公開する
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleDeleteVideo(video.id)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAnalytics = () => (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">分析</h2>
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">視聴者層</h3>
                        <div className="h-48 flex items-center justify-center text-gray-500">
                            グラフ表示予定
                        </div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">視聴地域</h3>
                        <div className="h-48 flex items-center justify-center text-gray-500">
                            グラフ表示予定
                        </div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">視聴デバイス</h3>
                        <div className="h-48 flex items-center justify-center text-gray-500">
                            グラフ表示予定
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderComments = () => (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">コメント管理</h2>
            <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                    <input
                        type="text"
                        placeholder="コメントを検索..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <select className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                        <option>すべての動画</option>
                        <option>最新の動画</option>
                        <option>人気の動画</option>
                    </select>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                    コメント管理機能は開発中です
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">チャンネル設定</h2>
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">基本情報</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">チャンネル名</label>
                            <input
                                type="text"
                                defaultValue={profile?.username}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">説明</label>
                            <textarea
                                rows={4}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                defaultValue={profile?.description || ""}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">通知設定</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-medium text-gray-900">メール通知</h4>
                                <p className="text-sm text-gray-500">新しいコメントやメッセージの通知</p>
                            </div>
                            <button className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-indigo-600">
                                <span className="translate-x-5 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        設定を保存
                    </button>
                </div>
            </div>
        </div>
    );

    const tabs = [
        { id: 'overview', name: '概要', icon: BarChart2 },
        { id: 'analytics', name: '分析', icon: BarChart2 },
        { id: 'comments', name: 'コメント', icon: MessageCircle },
        { id: 'promotions', name: '掲載枠管理', icon: DollarSign },
        { id: 'settings', name: '設定', icon: Settings }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return renderOverview();
            case 'analytics':
                return renderAnalytics();
            case 'comments':
                return renderComments();
            case 'promotions':
                return <PromotionSlots />;
            case 'settings':
                return renderSettings();
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* サイドバー */}
            <div className="lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {/* プロフィール画像表示 */}
                            {loading ? (
                                <Youtube className="h-8 w-8 text-gray-400" />
                            ) : (
                                <img
                                     src={youtuberProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <div>
                            {/* チャンネル名表示 */}
                            <h2 className="text-sm font-medium text-gray-900">
                                {/* youtuberProfile が存在すればそちらを優先、なければ profile, それもなければ user_metadata */}
                                {youtuberProfile?.channel_name || profile?.username || currentUser?.user_metadata?.channel_name}
                            </h2>
                            <p className="text-xs text-gray-500">YouTuber</p>
                        </div>
                    </div>

                    {/* アップロードボタン */}
                    <button className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 mb-6">
                        <Upload className="inline-block w-4 h-4 mr-2" />
                        動画をアップロード
                    </button>


                    <nav>
                        <ul className="space-y-2">
                            {tabs.map((tab) => (
                                <li key={tab.id}>
                                    <button
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab.id
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <tab.icon className="w-5 h-5 mr-3" />
                                        {tab.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-grow">
                {renderContent()}
            </div>
        </div>
    );
}