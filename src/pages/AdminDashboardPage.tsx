// src/pages/AdminDashboardPage.tsx

import React, { useState, useEffect, createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminDashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';
import UserStatistics from '../components/admin/UserStatistics';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// 管理者ダッシュボードのコンテキスト
export type AdminContextType = {
 refreshData: () => void;
 lastUpdate: number;
 setError: (message: string | null) => void;
 error: string | null;
};

// AdminContextの作成（Dashboard.tsxと同じ型を使用）
export const AdminContext = createContext<AdminContextType>({
 refreshData: () => {},
 lastUpdate: Date.now(),
 setError: () => {},
 error: null
});

interface StatCountProps {
 title: string;
 count: number;
 loading: boolean;
 bgColor: string;
}

const StatCount: React.FC<StatCountProps> = ({ title, count, loading, bgColor }) => (
 <div className={`${bgColor} rounded-lg shadow p-6`}>
   <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
   <p className="text-3xl font-bold">
     {loading ? <span className="text-gray-400">読み込み中...</span> : count}
   </p>
 </div>
);

const AdminDashboardPage: React.FC = () => {
 const [loading, setLoading] = useState<boolean>(true);
 const [isAdmin, setIsAdmin] = useState<boolean>(false);
 const [activeTab, setActiveTab] = useState<string>('users');
 const [userCount, setUserCount] = useState<number>(0);
 const [videoCount, setVideoCount] = useState<number>(0);
 const [reviewCount, setReviewCount] = useState<number>(0);
 const [statsLoading, setStatsLoading] = useState<boolean>(true);
 const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
 const [error, setError] = useState<string | null>(null);
 const navigate = useNavigate();

 // データ更新関数
 const refreshData = () => {
   console.log('全データをリフレッシュします...');
   setLastUpdate(Date.now());
   fetchStats();
 };

 useEffect(() => {
   const checkAdminStatus = async () => {
     setLoading(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       
       if (!user) {
         navigate('/login');
         return;
       }

       // プロフィール情報を取得して管理者権限をチェック
       const { data: profile, error } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', user.id)
         .single();

       if (error) {
         console.error('プロフィール情報の取得に失敗しました:', error);
         setError('プロフィール情報の取得に失敗しました。');
         navigate('/');
         return;
       }

       if (profile?.role !== 'admin') {
         console.warn('管理者権限がありません');
         setError('管理者権限がありません。このページにアクセスする権限がありません。');
         navigate('/');
         return;
       }

       setIsAdmin(true);
     } catch (error) {
       console.error('認証チェックに失敗しました:', error);
       setError('認証チェックに失敗しました。もう一度ログインしてください。');
       navigate('/');
     } finally {
       setLoading(false);
     }
   };

   checkAdminStatus();
 }, [navigate]);

 // Profilesテーブルの変更を監視するサブスクリプション
 useEffect(() => {
   if (!isAdmin) return;

   // profiles テーブルの変更を監視するサブスクリプションを設定
   const subscription = supabase
     .channel('admin-dashboard-profiles')
     .on('postgres_changes', { 
       event: '*', 
       schema: 'public', 
       table: 'profiles' 
     }, (payload) => {
       console.log('プロファイルが更新されました。データをリフレッシュします。', payload);
       refreshData();
     })
     .subscribe();

   // videos テーブルの変更を監視
   const videosSubscription = supabase
     .channel('admin-dashboard-videos')
     .on('postgres_changes', { 
       event: '*', 
       schema: 'public', 
       table: 'videos' 
     }, () => {
       console.log('動画データが更新されました。データをリフレッシュします。');
       refreshData();
     })
     .subscribe();

   // ratings テーブルの変更を監視
   const ratingsSubscription = supabase
     .channel('admin-dashboard-ratings')
     .on('postgres_changes', { 
       event: '*', 
       schema: 'public', 
       table: 'video_ratings' 
     }, () => {
       console.log('評価データが更新されました。データをリフレッシュします。');
       refreshData();
     })
     .subscribe();

   return () => {
     supabase.removeChannel(subscription);
     supabase.removeChannel(videosSubscription);
     supabase.removeChannel(ratingsSubscription);
   };
 }, [isAdmin]);

 // サイト全体の統計情報を取得
 const fetchStats = async () => {
   if (!isAdmin) return;

   setStatsLoading(true);
   try {
     // キャッシュ回避のタイムスタンプ
     const timestamp = new Date().getTime();
     console.log(`統計情報を取得します (${timestamp})...`);

     // ユーザー数を取得
     const { count: userCountData, error: userError } = await supabase
       .from('profiles')
       .select('*', { count: 'exact', head: true });
     
     if (userError) {
       console.error('ユーザー数の取得に失敗しました:', userError);
       setError('ユーザー数の取得に失敗しました。');
     } else {
       setUserCount(userCountData || 0);
     }

     // 動画数を取得
     const { count: videoCountData, error: videoError } = await supabase
       .from('videos')
       .select('*', { count: 'exact', head: true });
     
     if (videoError) {
       console.error('動画数の取得に失敗しました:', videoError);
       setError('動画数の取得に失敗しました。');
     } else {
       setVideoCount(videoCountData || 0);
     }

     // レビュー数を取得
     const { count: reviewCountData, error: reviewError } = await supabase
       .from('video_ratings')
       .select('*', { count: 'exact', head: true });
     
     if (reviewError) {
       console.error('レビュー数の取得に失敗しました:', reviewError);
       setError('レビュー数の取得に失敗しました。');
     } else {
       setReviewCount(reviewCountData || 0);
     }

     console.log(`統計情報取得完了: ユーザー ${userCountData || 0}件, 動画 ${videoCountData || 0}件, レビュー ${reviewCountData || 0}件`);
   } catch (error) {
     console.error('統計情報の取得に失敗しました:', error);
     setError('統計情報の取得に失敗しました。');
   } finally {
     setStatsLoading(false);
   }
 };

 useEffect(() => {
   if (isAdmin) {
     fetchStats();
   }
 }, [isAdmin, lastUpdate]);

 const handleTabChange = (tab: string) => {
   console.log(`タブを切り替えます: ${activeTab} → ${tab}`);
   setActiveTab(tab);
   setError(null); // タブ切り替え時にエラーをクリア
   // タブ切り替え時に明示的にデータを更新
   setLastUpdate(Date.now());
 };

 if (loading) {
   return (
     <div className="flex justify-center items-center h-screen">
       <LoadingSpinner />
     </div>
   );
 }

 if (!isAdmin) {
   return null; // すでにナビゲートしているので何も表示しない
 }

 // 管理ダッシュボードのコンテキスト値
 const contextValue: AdminContextType = {
   refreshData,
   lastUpdate,
   setError,
   error
 };

 return (
   <AdminContext.Provider value={contextValue}>
     <div className="container mx-auto px-4 py-8">
       <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>
       
       {error && (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
           <svg className="h-5 w-5 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
           </svg>
           <span>{error}</span>
         </div>
       )}
       
       {/* 統計概要 */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <StatCount
           title="登録ユーザー数"
           count={userCount}
           loading={statsLoading}
           bgColor="bg-white"
         />
         <StatCount
           title="登録動画数"
           count={videoCount}
           loading={statsLoading}
           bgColor="bg-white"
         />
         <StatCount
           title="レビュー数"
           count={reviewCount}
           loading={statsLoading}
           bgColor="bg-white"
         />
       </div>
       
       {/* タブナビゲーション */}
       <div className="bg-white rounded-lg shadow mb-6">
         <div className="border-b border-gray-200">
           <nav className="flex -mb-px">
             <button
               onClick={() => handleTabChange('users')}
               className={`py-4 px-6 font-medium text-sm ${
                 activeTab === 'users'
                   ? 'border-b-2 border-blue-500 text-blue-600'
                   : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               ユーザー管理
             </button>
             <button
               onClick={() => handleTabChange('user-stats')}
               className={`py-4 px-6 font-medium text-sm ${
                 activeTab === 'user-stats'
                   ? 'border-b-2 border-blue-500 text-blue-600'
                   : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               ユーザー統計
             </button>
             <button
               onClick={() => handleTabChange('analytics')}
               className={`py-4 px-6 font-medium text-sm ${
                 activeTab === 'analytics'
                   ? 'border-b-2 border-blue-500 text-blue-600'
                   : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               統計・分析
             </button>
             <button
               onClick={() => handleTabChange('promotion')}
               className={`py-4 px-6 font-medium text-sm ${
                 activeTab === 'promotion'
                   ? 'border-b-2 border-blue-500 text-blue-600'
                   : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               掲載枠管理
             </button>
           </nav>
         </div>
         
         <div className="p-4">
           {activeTab === 'users' && (
             <div>
               <h2 className="text-xl font-semibold mb-4">ユーザー管理</h2>
               <p className="text-gray-600 mb-2">
                 ユーザーアカウントの管理、権限設定、アクティビティ監視などの機能を提供します。
               </p>
               <UserManagement key={`user-management-${lastUpdate}`} />
             </div>
           )}
           
           {activeTab === 'user-stats' && (
             <div>
               <h2 className="text-xl font-semibold mb-4">ユーザー統計</h2>
               <p className="text-gray-600 mb-2">
                 ユーザー登録状況の統計データやユーザータイプ別の分布を可視化します。
               </p>
               <UserStatistics key={`user-stats-${lastUpdate}`} />
             </div>
           )}
           
           {activeTab === 'analytics' && (
             <div>
               <h2 className="text-xl font-semibold mb-4">統計・分析</h2>
               <p className="text-gray-600 mb-2">
                 サイト利用状況、ユーザー行動、評価傾向などの詳細な分析データを提供します。
               </p>
               <AnalyticsDashboard key={`analytics-${lastUpdate}`} />
             </div>
           )}
           
           {activeTab === 'promotion' && (
             <div>
               <h2 className="text-xl font-semibold mb-4">掲載枠管理</h2>
               <p className="text-gray-600 mb-2">
                 YouTuber向け掲載枠の設定、管理、予約状況の確認などを行います。
               </p>
               <AdminDashboard key={`admin-dashboard-${lastUpdate}`} />
             </div>
           )}
         </div>
       </div>
       
       {/* システム情報 */}
       <div className="bg-white rounded-lg shadow p-6">
         <h2 className="text-xl font-semibold mb-4">システム情報</h2>
         <div className="grid grid-cols-2 gap-4">
           <div>
             <p className="text-sm text-gray-500">アプリケーションバージョン</p>
             <p className="font-medium">1.0.0</p>
           </div>
           <div>
             <p className="text-sm text-gray-500">最終データベース更新</p>
             <p className="font-medium">{new Date(lastUpdate).toLocaleDateString('ja-JP', { 
               year: 'numeric', 
               month: 'short', 
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
             })}</p>
           </div>
           <div>
             <p className="text-sm text-gray-500">サーバーステータス</p>
             <p className="font-medium text-green-500">正常稼働中</p>
           </div>
           <div>
             <p className="text-sm text-gray-500">API状態</p>
             <p className="font-medium text-green-500">正常</p>
           </div>
         </div>
         <div className="mt-4 text-right">
           <button 
             onClick={refreshData}
             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center ml-auto"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
             </svg>
             データを更新
           </button>
         </div>
       </div>
     </div>
   </AdminContext.Provider>
 );
};

export default AdminDashboardPage;