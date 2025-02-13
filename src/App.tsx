// src/App.tsx

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { useAuth } from './contexts/AuthContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const SignUp = lazy(() => import('./components/auth/SignUp'));
const Login = lazy(() => import('./components/auth/Login'));
const ProfileRoutes = lazy(() => import('./components/profile/ProfileRoutes'));
const Dashboard = lazy(() => import('./components/youtuber/Dashboard'));
const Register = lazy(() => import('./components/youtuber/Register'));
const GenreVideoList = lazy(() => import('./components/genre/GenreVideoList'));
const VideoDetail = lazy(() => import('./components/video/VideoDetail'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const EventList = lazy(() => import('./components/events/EventList'));
const EventForm = lazy(() => import('./components/events/EventForm'));
const EventDetail = lazy(() => import('./components/events/EventDetail'));
const EventEditForm = lazy(() => import('./components/events/EventEditForm'));
const ActivePromotions = lazy(() => import('./components/youtuber/ActivePromotions'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
}

function YouTuberRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, youtuberProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!youtuberProfile) return <Navigate to="/youtuber/register" replace />;
  return <>{children}</>;
}

const App = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            
            <Route 
              path="/profile/*" 
              element={
                <PrivateRoute>
                  <ProfileRoutes />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/youtuber/dashboard" 
              element={
                <YouTuberRoute>
                  <Dashboard />
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
                  <ActivePromotions promotions={[]} />
                </YouTuberRoute>
              } 
            />

            <Route path="/genre/:slug" element={<GenreVideoList />} />
            <Route path="/video/:videoId" element={<VideoDetail />} />
            <Route path="/search" element={<SearchPage />} />

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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default App;