/* eslint-disable react-refresh/only-export-components */
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MatchingSystem from '@/components/matching/MatchingSystem';
import NotificationSound from '@/components/layout/NotificationSound';
import { NotificationProvider } from '@/contexts/NotificationContext';
import PremiumGuard from '@/components/premium/PremiumGuard';
import PremiumExpired from '@/components/premium/PremiumExpired';
import StripeContextProvider from '@/contexts/StripeContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PWAInstaller from '@/components/shared/PWAInstaller';
import DebugInfo from '@/components/shared/DebugInfo';
import BottomNavigation from '@/components/ui/BottomNavigation';

/* -------- lazy imports -------- */
const HomePage = lazy(() => import('@/pages/HomePage'));
const SignUp = lazy(() => import('@/components/events/auth/SignUp'));
const Login = lazy(() => import('@/components/events/auth/Login'));
const ProfileRoutes = lazy(() => import('@/components/profile/ProfileRoutes'));
const Register = lazy(() => import('@/components/youtuber/Register'));
const GenreVideoList = lazy(() => import('@/components/genre/GenreVideoList'));
const VideoDetail = lazy(() => import('@/components/video/VideoDetail'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const EventList = lazy(() => import('@/components/events/EventList'));
const EventForm = lazy(() => import('@/components/events/EventForm'));
const EventDetail = lazy(() => import('@/components/events/EventDetail'));
const EventEditForm = lazy(() => import('@/components/events/EventEditForm'));
const ActivePromotions = lazy(() => import('@/components/youtuber/ActivePromotions'));
const PremiumDashboardPage = lazy(() => import('@/pages/PremiumDashboardPage'));
const PremiumUpgradePage = lazy(() => import('@/pages/PremiumUpgradePage'));
const YouTuberDashboardPage = lazy(() => import('@/pages/YouTuberDashboardPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const MessagingPage = lazy(() => import('@/pages/MessagingPage'));
const HelpCenterPage = lazy(() => import('@/pages/HelpCenterPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const FAQPage = lazy(() => import('@/pages/FAQPage'));
const ReportPage = lazy(() => import('@/pages/ReportPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const GuidePage = lazy(() => import('@/components/youtuber/GuidePage'));
const PlansPage = lazy(() => import('@/components/youtuber/PlansPage'));
const GuidelinesPage = lazy(() => import('@/components/youtuber/GuidelinesPage'));

/* -------- プレースホルダー -------- */
const PremiumPlaceholder = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div className="max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold mb-6">{title}</h1>
    <div className="bg-yellow-50 border border-yellow-500 rounded-lg p-6">
      <p className="text-yellow-700">{message}</p>
    </div>
  </div>
);

/* -------------------------- 認可系ルート -------------------------- */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function YouTuberRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isYoutuber, setIsYoutuber] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setIsYoutuber(false);
        setChecking(false);
        return;
      }
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('youtuber_profiles')
        .select('id')
        .eq('id', user.id);
      if (error) console.error(error);
      setIsYoutuber((data?.length ?? 0) > 0);
      setChecking(false);
    };
    if (!loading) run();
  }, [user?.id, loading]);

  if (loading || checking)
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!isYoutuber) return <Navigate to="/youtuber/register" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (error) console.error(error);
      setIsAdmin(data?.role === 'admin');
      setChecking(false);
    };
    if (!loading) run();
  }, [user?.id, loading]);

  if (loading || checking)
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const PremiumRoute = ({ children }: { children: React.ReactNode }) => (
  <PremiumGuard>{children}</PremiumGuard>
);

/* -------------------------- 依存ロード -------------------------- */
const loadDependencies = async () => {
  const { supabase } = await import('@/lib/supabase');
  const { getStripe } = await import('@/lib/stripe');
  const _stripe = getStripe?.();
  return { supabase, _stripe };
};

/* ============================================================= */
const App = () => {
  const { isPremium } = useAuth();
  const [ready, setReady] = useState(false);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('debug') === 'true') {
      setDebug(true);
      console.log('Debug mode ON');
    }
  }, []);

  const init = useCallback(async () => {
    await loadDependencies();
    setReady(true);
  }, []);

  useEffect(() => {
    init();
  }, []);

  if (!ready)
    return (
      <div className="min-h-screen flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );

  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <StripeContextProvider>
            <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-dark-bg dark:text-dark-text-primary">
              <Header />
              <NotificationSound volume={0.5} enabled />
              <PWAInstaller />
              {debug && <DebugInfo />}

              <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
                <Suspense
                  fallback={
                    <div className="flex justify-center items-center h-64">
                      <LoadingSpinner />
                    </div>
                  }
                >
                  <Routes>
                    {/* ---------- 公開ルート ---------- */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/genre/:slug" element={<GenreVideoList />} />
                    <Route path="/video/:videoId" element={<VideoDetail />} />
                    <Route path="/help" element={<HelpCenterPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/report" element={<ReportPage />} />
                    <Route path="/about" element={<AboutPage />} />

                    {/* ---------- 認証ルート ---------- */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />

                    {/* ---------- プロフィール ---------- */}
                    <Route
                      path="/profile/*"
                      element={
                        <PrivateRoute>
                          <ProfileRoutes />
                        </PrivateRoute>
                      }
                    />

                    {/* ---------- メッセージ ---------- */}
                    <Route
                      path="/messages/*"
                      element={
                        <PrivateRoute>
                          <MessagingPage />
                        </PrivateRoute>
                      }
                    />

                    {/* ---------- プレミアム ---------- */}
                    <Route path="/premium">
                      <Route
                        index
                        element={
                          <PrivateRoute>
                            {isPremium ? (
                              <Navigate to="/premium/dashboard" replace />
                            ) : (
                              <Navigate to="/premium/upgrade" replace />
                            )}
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
                      <Route
                        path="matching"
                        element={
                          <PremiumRoute>
                            <div className="max-w-4xl mx-auto">
                              <h1 className="text-2xl font-bold mb-6">
                                プレミアムマッチング
                              </h1>
                              <MatchingSystem />
                            </div>
                          </PremiumRoute>
                        }
                      />
                    </Route>

                    {/* ---------- YouTuber ---------- */}
                    <Route
                      path="/youtuber/register"
                      element={
                        <PrivateRoute>
                          <Register />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/youtuber/dashboard"
                      element={
                        <YouTuberRoute>
                          <YouTuberDashboardPage />
                        </YouTuberRoute>
                      }
                    />
                    <Route path="/youtuber/guide" element={<GuidePage />} />
                    <Route path="/youtuber/plans" element={<PlansPage />} />
                    <Route
                      path="/youtuber/guidelines"
                      element={<GuidelinesPage />}
                    />
                    <Route
                      path="/youtuber/promotions"
                      element={<ActivePromotions />}
                    />

                    {/* ---------- イベント ---------- */}
                    <Route path="/events">
                      <Route index element={<EventList />} />
                      <Route
                        path="create"
                        element={
                          <PrivateRoute>
                            <EventForm />
                          </PrivateRoute>
                        }
                      />
                      <Route path=":eventId" element={<EventDetail />} />
                      <Route
                        path=":eventId/edit"
                        element={
                          <PrivateRoute>
                            <EventEditForm />
                          </PrivateRoute>
                        }
                      />
                    </Route>

                    {/* ---------- 管理者 ---------- */}
                    <Route
                      path="/admin/*"
                      element={
                        <AdminRoute>
                          <AdminDashboardPage />
                        </AdminRoute>
                      }
                    />

                    {/* ---------- フォールバック ---------- */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>

              <BottomNavigation />
              <div className="hidden md:block">
                <Footer />
              </div>
            </div>
          </StripeContextProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
