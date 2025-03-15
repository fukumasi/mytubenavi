// src/App.tsx

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';
import MatchingSystem from './components/matching/MatchingSystem';
import NotificationSound from './components/layout/NotificationSound';
import { NotificationProvider } from './contexts/NotificationContext';
import PremiumGuard from './components/premium/PremiumGuard';
import PremiumExpired from './components/premium/PremiumExpired';
import StripeContextProvider from './contexts/StripeContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const SignUp = lazy(() => import('./components/auth/SignUp'));
const Login = lazy(() => import('./components/auth/Login'));
const ProfileRoutes = lazy(() => import('./components/profile/ProfileRoutes'));
const Register = lazy(() => import('./components/youtuber/Register'));
const GenreVideoList = lazy(() => import('./components/genre/GenreVideoList'));
const VideoDetail = lazy(() => import('./components/video/VideoDetail'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const EventList = lazy(() => import('./components/events/EventList'));
const EventForm = lazy(() => import('./components/events/EventForm'));
const EventDetail = lazy(() => import('./components/events/EventDetail'));
const EventEditForm = lazy(() => import('./components/events/EventEditForm'));
const ActivePromotions = lazy(() => import('./components/youtuber/ActivePromotions'));
const PremiumDashboardPage = lazy(() => import('./pages/PremiumDashboardPage'));
const PremiumUpgradePage = lazy(() => import('./pages/PremiumUpgradePage'));
const YouTuberDashboardPage = lazy(() => import('./pages/YouTuberDashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage')); // 追加: Admin管理者ダッシュボード

// 一時的なプレミアム会員関連コンポーネント（後で実装予定）
const PremiumPlaceholder = ({ title, message }: { title: string; message: string }) => (
 <div className="max-w-4xl mx-auto">
   <h1 className="text-2xl font-bold mb-6">{title}</h1>
   <div className="bg-yellow-50 border border-yellow-500 rounded-lg p-6">
     <p className="text-yellow-700">{message}</p>
   </div>
 </div>
);

// プライベートルート（ログインユーザーのみアクセス可能）
function PrivateRoute({ children }: { children: React.ReactNode }) {
 const { user, loading } = useAuth();
 
 if (loading) {
   return (
     <div className="flex justify-center items-center h-64">
       <LoadingSpinner />
     </div>
   );
 }
 
 return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// YouTuberルート（YouTuberのみアクセス可能）
function YouTuberRoute({ children }: { children: React.ReactNode }) {
 const { user, loading } = useAuth();
 const [isYoutuber, setIsYoutuber] = React.useState<boolean | null>(null);
 const [checkingStatus, setCheckingStatus] = React.useState(true);

 React.useEffect(() => {
   const checkYoutuberStatus = async () => {
     if (!user) {
       setIsYoutuber(false);
       setCheckingStatus(false);
       return;
     }

     try {
       const { data, error } = await import('./lib/supabase').then(({ supabase }) =>
         supabase
           .from('youtuber_profiles')
           .select('id')
           .eq('id', user.id) // 「user_id」ではなく「id」を使用
           .single()
       );

       if (error) {
         console.error('YouTuber status check error:', error);
         setIsYoutuber(false);
       } else {
         setIsYoutuber(!!data);
       }
     } catch (error) {
       console.error('Error checking YouTuber status:', error);
       setIsYoutuber(false);
     } finally {
       setCheckingStatus(false);
     }
   };

   if (!loading) {
     checkYoutuberStatus();
   }
 }, [user, loading]);

 if (loading || checkingStatus) {
   return (
     <div className="flex justify-center items-center h-64">
       <LoadingSpinner />
     </div>
   );
 }

 if (!user) return <Navigate to="/login" replace />;
 if (!isYoutuber) return <Navigate to="/youtuber/register" replace />;
 
 return <>{children}</>;
}

// 追加: 管理者ルート（管理者のみアクセス可能）
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = React.useState(true);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setCheckingStatus(false);
        return;
      }

      try {
        const { data, error } = await import('./lib/supabase').then(({ supabase }) =>
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        );

        if (error) {
          console.error('Admin status check error:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.role === 'admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

  if (loading || checkingStatus) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

// プレミアムルート（プレミアム会員のみアクセス可能）
function PremiumRoute({ children }: { children: React.ReactNode }) {
 return <PremiumGuard>{children}</PremiumGuard>;
}

const App = () => {
 const { isPremium } = useAuth();
 
 return (
   <NotificationProvider>
     <StripeContextProvider>
       <div className="min-h-screen flex flex-col bg-gray-100">
         <Header />
         <NotificationSound volume={0.5} enabled={true} />
         
         <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
           <Suspense fallback={
             <div className="flex justify-center items-center h-64">
               <LoadingSpinner />
             </div>
           }>
             <Routes>
               <Route path="/" element={<HomePage />} />
               <Route path="/signup" element={<SignUp />} />
               <Route path="/login" element={<Login />} />
               
               {/* プロフィール関連ルート */}
               <Route 
                 path="/profile/*" 
                 element={
                   <PrivateRoute>
                     <ProfileRoutes />
                   </PrivateRoute>
                 } 
               />

               {/* 管理者ダッシュボードルート */}
               <Route
                 path="/admin"
                 element={
                   <AdminRoute>
                     <AdminDashboardPage />
                   </AdminRoute>
                 }
               />

               {/* YouTuber関連ルート */}
               <Route 
                 path="/youtuber/dashboard" 
                 element={
                   <YouTuberRoute>
                     <YouTuberDashboardPage />
                   </YouTuberRoute>
                 } 
               />
               
               <Route 
                 path="/youtuber/register" 
                 element={
                   <PrivateRoute>
                     <Register />
                   </PrivateRoute>
                 } 
               />

               <Route 
                 path="/youtuber/promotions/active" 
                 element={
                   <YouTuberRoute>
                     <ActivePromotions />
                   </YouTuberRoute>
                 } 
               />

               {/* プレミアム関連ルート */}
               <Route path="/premium">
                 <Route 
                   index 
                   element={
                     <PrivateRoute>
                       {isPremium ? 
                         <Navigate to="/premium/dashboard" replace /> : 
                         <Navigate to="/premium/upgrade" replace />
                       }
                     </PrivateRoute>
                   }
                 />
                 
                 <Route 
                   path="dashboard" 
                   element={
                     <PremiumGuard>
                       <PremiumDashboardPage />
                     </PremiumGuard>
                   } 
                 />
                 
                 <Route 
                   path="upgrade" 
                   element={
                     <PrivateRoute>
                       <PremiumUpgradePage />
                     </PrivateRoute>
                   } 
                 />
                 
                 <Route 
                   path="expired" 
                   element={
                     <PrivateRoute>
                       <PremiumExpired />
                     </PrivateRoute>
                   } 
                 />
                 
                 <Route 
                   path="features" 
                   element={
                     <PrivateRoute>
                       <PremiumPlaceholder 
                         title="プレミアム機能一覧"
                         message="プレミアム会員だけが利用できる機能の一覧です。"
                       />
                     </PrivateRoute>
                   } 
                 />
                 
                 {/* プレミアム会員専用ルート */}
                 <Route 
                   path="matching"
                   element={
                     <PremiumRoute>
                       <div className="max-w-4xl mx-auto">
                         <h1 className="text-2xl font-bold mb-6">プレミアムマッチング</h1>
                         <MatchingSystem />
                       </div>
                     </PremiumRoute>
                   } 
                 />
                 
                 <Route 
                   path="messaging/*"
                   element={
                     <PremiumRoute>
                       <div className="max-w-4xl mx-auto">
                         <h1 className="text-2xl font-bold mb-6">プレミアムメッセージ</h1>
                         <p>プレミアム会員限定のメッセージ機能です。</p>
                       </div>
                     </PremiumRoute>
                   } 
                 />
                 
                 <Route 
                   path="advanced-search"
                   element={
                     <PremiumRoute>
                       <div className="max-w-4xl mx-auto">
                         <h1 className="text-2xl font-bold mb-6">高度な検索</h1>
                         <p>プレミアム会員限定の高度な検索機能です。</p>
                       </div>
                     </PremiumRoute>
                   } 
                 />
                 
                 <Route 
                   path="extend"
                   element={
                     <PremiumRoute>
                       <PremiumPlaceholder 
                         title="プレミアム会員延長"
                         message="プレミアム会員期間を延長するページです。"
                       />
                     </PremiumRoute>
                   } 
                 />
                 
                 <Route 
                   path="cancel"
                   element={
                     <PremiumRoute>
                       <PremiumPlaceholder 
                         title="自動更新の停止"
                         message="プレミアム会員の自動更新を停止するページです。"
                       />
                     </PremiumRoute>
                   } 
                 />
               </Route>

               {/* 簡易マッチングルート（旧実装との互換性のため） */}
               <Route 
                 path="/matching" 
                 element={
                   <PrivateRoute>
                     <div className="max-w-4xl mx-auto">
                       <h1 className="text-2xl font-bold mb-6">マッチング</h1>
                       {!isPremium && (
                         <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                           <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                             プレミアム会員限定機能
                           </h2>
                           <p className="text-yellow-700 mb-4">
                             マッチング機能のフル機能を利用するにはプレミアム会員へのアップグレードが必要です。
                           </p>
                           <div className="text-center">
                             <a 
                               href="/premium/upgrade" 
                               className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded transition duration-150"
                             >
                               プレミアム会員になる
                             </a>
                           </div>
                         </div>
                       )}
                       <MatchingSystem />
                     </div>
                   </PrivateRoute>
                 } 
               />

               {/* 一般ページルート */}
               <Route path="/genre/:slug" element={<GenreVideoList />} />
               <Route path="/video/:videoId" element={<VideoDetail />} />
               <Route path="/search" element={<SearchPage />} />

               {/* イベント関連ルート */}
               <Route path="/events">
                 <Route index element={<EventList />} />
                 <Route 
                   path="new" 
                   element={
                     <PrivateRoute>
                       <EventForm />
                     </PrivateRoute>
                   } 
                 />
                 <Route path=":id">
                   <Route index element={<EventDetail />} />
                   <Route 
                     path="edit" 
                     element={
                       <PrivateRoute>
                         <EventEditForm />
                       </PrivateRoute>
                     } 
                   />
                 </Route>
               </Route>

               {/* 404ルート */}
               <Route path="*" element={<Navigate to="/" replace />} />
             </Routes>
           </Suspense>
         </main>
         <Footer />
       </div>
     </StripeContextProvider>
   </NotificationProvider>
 );
};

export default App;