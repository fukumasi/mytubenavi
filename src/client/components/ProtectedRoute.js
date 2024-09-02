import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner'; // LoadingSpinnerコンポーネントをインポート

const ProtectedRoute = ({ requireAuth = true, requireTwoFactor = false, children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />; // カスタムのローディングコンポーネントを使用
  }

  if (!isAuthenticated && requireAuth) {
    // ユーザーが認証されていない場合、ログインページにリダイレクト
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireTwoFactor && !user?.isTwoFactorEnabled) {
    // 2要素認証が必要だが有効になっていない場合、設定ページにリダイレクト
    return <Navigate to="/two-factor-auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    // 認証が不要なルートに認証済みユーザーがアクセスした場合、ホームページにリダイレクト
    return <Navigate to="/" replace />;
  }

  // 子コンポーネントが渡された場合はそれを、そうでない場合はOutletを返す
  return children ? children : <Outlet />;
};

export default ProtectedRoute;

// 使用例：
// <Route element={<ProtectedRoute requireAuth={true} requireTwoFactor={true} />}>
//   <Route path="/sensitive-data" element={<SensitiveDataPage />} />
// </Route>
//
// <Route element={<ProtectedRoute requireAuth={false} />}>
//   <Route path="/login" element={<LoginPage />} />
// </Route>