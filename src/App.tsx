import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import GenreVideoList from './components/genre/GenreVideoList';
import VideoDetail from './components/video/VideoDetail';
import Footer from './components/layout/Footer';
import SignUp from './components/auth/SignUp';
import Login from './components/auth/Login';
import UserProfile from './components/profile/UserProfile';
import Dashboard from './components/youtuber/Dashboard';
import Register from './components/youtuber/Register';
import SearchPage from './pages/SearchPage';
import HomePage from './pages/HomePage';
import { AuthProvider } from './contexts/AuthContext';
import EventForm from './components/events/EventForm';
import EventList from './components/events/EventList';
import EventDetail from './components/events/EventDetail';
import EventEditForm from './components/events/EventEditForm';

export default function App() {
 return (
   <AuthProvider>
     <Router>
       <div className="min-h-screen flex flex-col bg-gray-100">
         <Header />
         <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
           <Routes>
             {/* メインルート */}
             <Route path="/" element={<HomePage />} />
             
             {/* 認証関連 */}
             <Route path="/signup" element={<SignUp />} />
             <Route path="/login" element={<Login />} />
             <Route path="/profile" element={<UserProfile />} />

             {/* YouTuber関連 */}
             <Route path="/youtuber">
               <Route path="dashboard" element={<Dashboard />} />
               <Route path="register" element={<Register />} />
             </Route>

             {/* 動画関連 */}
             <Route path="/genre/:genre" element={<GenreVideoList />} />
             <Route path="/video/:videoId" element={<VideoDetail />} />
             <Route path="/search" element={<SearchPage />} />

             {/* イベント関連 */}
             <Route path="/events">
               <Route index element={<EventList />} />
               <Route path="new" element={<EventForm />} />
               <Route path=":id">
                 <Route index element={<EventDetail />} />
                 <Route path="edit" element={<EventEditForm />} />
               </Route>
             </Route>

             {/* 404ページ */}
             <Route path="*" element={<Navigate to="/" replace />} />
           </Routes>
         </main>
         <Footer />
       </div>
     </Router>
   </AuthProvider>
 );
}