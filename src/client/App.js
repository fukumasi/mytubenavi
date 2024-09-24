import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from 'styled-components';
import { AuthProvider } from './contexts/AuthContext';
import { FirebaseProvider } from './contexts/FirebaseContext';
import { SettingsProvider } from './contexts/SettingsContext';  // この行を追加
import { HelmetProvider } from 'react-helmet-async';
import { defaultTheme } from './styles/theme';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <FirebaseProvider>
          <AuthProvider>
            <SettingsProvider>  {/* この行を追加 */}
              <ThemeProvider theme={defaultTheme}>
                <Router>
                  <Header />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
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
                  </Routes>
                  <Footer />
                </Router>
              </ThemeProvider>
            </SettingsProvider>  {/* この行を追加 */}
          </AuthProvider>
        </FirebaseProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;