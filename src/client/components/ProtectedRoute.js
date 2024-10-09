import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ requireAuth = true, requireEmailVerification = true, children }) => {
  const { currentUser, loading, isEmailVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser && requireAuth) {
    // ユーザーが認証されていない場合、ログインページにリダイレクト
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (currentUser && requireAuth && requireEmailVerification && !isEmailVerified) {
    // ユーザーが認証されているがメールが確認されていない場合、メール確認ページにリダイレクト
    return <Navigate to="/email-verification" state={{ from: location }} replace />;
  }

  if (!requireAuth && currentUser) {
    // 認証が不要なルートに認証済みユーザーがアクセスした場合、ホームページにリダイレクト
    return <Navigate to="/" replace />;
  }

  // 子コンポーネントが渡された場合はそれを、そうでない場合はOutletを返す
  return children ? children : <Outlet />;
};

export default ProtectedRoute;