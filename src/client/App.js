import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { getRedirectResult } from 'firebase/auth';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ForgotPassword from './pages/ForgotPassword';
import EmailVerification from './pages/EmailVerification';
import GenrePage from './pages/GenrePage';
import RubiksCubeGuide from './pages/RubiksCubeGuide';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ThreeColumnLayout from './components/ThreeColumnLayout';
import GlobalStyle from './styles/GlobalStyle';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const { auth } = useFirebase();
  const { theme } = useTheme();

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('ユーザーがサインインしました', result.user);
          // ここで必要な処理を行う（例：ユーザー情報の保存、リダイレクトなど）
        }
      } catch (error) {
        console.error('認証エラー:', error);
      }
    };

    handleRedirectResult();
  }, [auth]);

  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
        <Header />
        <ThreeColumnLayout
          leftColumn={<div>Left Column Content</div>}
          rightColumn={<div>Right Column Content</div>}
          mainColumn={
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route 
                path="/email-verification" 
                element={
                  <ProtectedRoute requireEmailVerification={false}>
                    <EmailVerification />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/edit-profile" 
                element={
                  <ProtectedRoute>
                    <EditProfile />
                  </ProtectedRoute>
                } 
              />
              <Route path="/genres" element={<GenrePage level={0} />} />
              <Route path="/genre/:level/:genreId" element={<GenrePage />} />
              <Route path="/rubiks-cube-guide" element={<RubiksCubeGuide />} />
            </Routes>
          }
        />
        <Footer />
      </Router>
    </StyledThemeProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <FirebaseProvider>
          <SettingsProvider>
            <AuthProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </AuthProvider>
          </SettingsProvider>
        </FirebaseProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;