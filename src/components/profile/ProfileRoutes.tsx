// src/components/profile/ProfileRoutes.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import UserProfile from './UserProfile';
import FavoriteVideos from './FavoriteVideos';
import ReviewHistory from './ReviewHistory';
import ViewHistory from './ViewHistory';
import NotificationsPage from './NotificationsPage';
import NotificationSettings from './NotificationSettings';
import SettingsPage from './SettingsPage';

export default function ProfileRoutes() {
 return (
   <Routes>
     <Route path="/" element={<UserProfile />} />
     <Route path="/favorites" element={<FavoriteVideos 
       videos={[]} 
       loading={false} 
       error={null} 
     />} />
     <Route path="/reviews" element={<ReviewHistory 
       reviews={[]} 
       loading={false} 
       error={null} 
     />} />
     <Route path="/history" element={<ViewHistory 
       videos={[]} 
       loading={false} 
       error={null} 
     />} />
     <Route path="/notifications" element={<NotificationsPage />} />
     <Route path="/notification-settings" element={<NotificationSettings />} />
     <Route path="/settings" element={<SettingsPage />} />
     <Route path="*" element={<Navigate to="/profile" replace />} />
   </Routes>
 );
}