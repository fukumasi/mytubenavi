import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import EditProfile from './pages/EditProfile';
import Header from './components/Header';
import Footer from './components/Footer';
import VideoDetail from './pages/VideoDetail';
import SearchResults from './pages/SearchResults';
import About from './pages/About';
import theme from './styles/theme';
import GlobalStyle from './styles/GlobalStyle';
import { Container, MainContent } from './styles/LayoutComponents';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import ScrollToTop from './components/ScrollToTop';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Copyright from './pages/Copyright';
import AdManagement from './pages/AdManagement';
import AdCreate from './pages/AdCreate';
import AdEdit from './pages/AdEdit';
import TwoFactorAuthSettings from './pages/TwoFactorAuthSettings';
import NotFound from './components/NotFound';
import UserDashboard from './pages/UserDashboard'; // 新しく作成したUserDashboardをインポート

const queryClient = new QueryClient();

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Simulate initial loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  return (
    <>
      <ScrollToTop />
      <Container>
        <Header />
        <MainContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <Routes location={location}>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/copyright" element={<Copyright />} />
              <Route path="/video/:id" element={<VideoDetail />} />
              <Route path="/search" element={<SearchResults />} />

              {/* Authentication routes */}
              <Route element={<ProtectedRoute requireAuth={false} />}>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* Protected routes */}
              <Route element={<ProtectedRoute requireAuth={true} />}>
                <Route path="/dashboard" element={<UserDashboard />} /> {/* 新しく追加したUserDashboardへのルート */}
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/two-factor-auth" element={<TwoFactorAuthSettings />} />
              </Route>

              {/* Admin routes (assuming admin requires 2FA) */}
              <Route element={<ProtectedRoute requireAuth={true} requireTwoFactor={true} />}>
                <Route path="/ad-management" element={<AdManagement />} />
                <Route path="/ad-create" element={<AdCreate />} />
                <Route path="/ad-edit/:id" element={<AdEdit />} />
              </Route>

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </MainContent>
        <Footer />
      </Container>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <ThemeProvider theme={theme.light}>
            <GlobalStyle />
            <ErrorBoundary>
              <Router>
                <AppContent />
              </Router>
            </ErrorBoundary>
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

// 将来的な機能拡張のためのコメント
// TODO: ダークモードの実装
// TODO: 多言語対応の実装
// TODO: ユーザー設定ページの追加
// TODO: 広告分析ダッシュボードの追加
// TODO: 2要素認証の設定ページへのリンクをユーザープロフィールページに追加
// TODO: エラーページ（500など）の実装
// TODO: パフォーマンス最適化（コード分割、遅延ローディングなど）
// TODO: アクセシビリティの改善
// TODO: SEO最適化
// TODO: ユーザーフィードバック機能の実装
// TODO: ソーシャルメディア共有機能の追加
// TODO: プッシュ通知の実装
// TODO: オフライン機能のサポート（PWA）
// TODO: ユーザーロールに基づいたアクセス制御の実装
// TODO: リアルタイム通知システムの実装
// TODO: ユーザーアクティビティログの実装
// TODO: ダッシュボードのカスタマイズ機能
// TODO: データ可視化機能の強化
// TODO: ユーザー間のメッセージング機能
// TODO: コンテンツレコメンデーションシステムの実装