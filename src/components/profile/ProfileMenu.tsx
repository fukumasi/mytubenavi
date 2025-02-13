// src/components/profile/ProfileMenu.tsx

import { NavLink } from 'react-router-dom';
import { User, Star, History, Bell, Settings, Heart } from 'lucide-react';

const menuItems = [
 {
   path: '/profile',
   icon: <User className="h-5 w-5" />,
   label: 'プロフィール'
 },
 {
   path: '/profile/favorites',
   icon: <Heart className="h-5 w-5" />,
   label: 'お気に入り動画'
 },
 {
   path: '/profile/reviews',
   icon: <Star className="h-5 w-5" />,
   label: '評価・レビュー'
 },
 {
   path: '/profile/history',
   icon: <History className="h-5 w-5" />,
   label: '視聴履歴'
 },
 {
   path: '/profile/notifications',
   icon: <Bell className="h-5 w-5" />,
   label: '新着通知'
 },
 {
   path: '/profile/settings',
   icon: <Settings className="h-5 w-5" />,
   label: '設定'
 }
];

export default function ProfileMenu() {
 return (
   <nav className="space-y-1">
     {menuItems.map(item => (
       <NavLink
         key={item.path}
         to={item.path}
         className={({ isActive }) =>
           `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
             isActive
               ? 'bg-blue-100 text-blue-700'
               : 'text-gray-900 hover:bg-gray-100'
           }`
         }
       >
         <span className="mr-3">{item.icon}</span>
         {item.label}
       </NavLink>
     ))}
   </nav>
 );
}