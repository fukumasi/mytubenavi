// src/components/layout/NotificationBell.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Notification, NotificationType } from '../../types/notification';

export default function NotificationBell() {
 const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();
 const [isOpen, setIsOpen] = useState(false);
 const bellRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
   const handleClickOutside = (event: MouseEvent) => {
     if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
       setIsOpen(false);
     }
   };

   document.addEventListener('mousedown', handleClickOutside);
   return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const handleNotificationClick = async (notification: Notification) => {
   if (!notification.isRead) {
     await markAsRead(notification.id);
   }
   setIsOpen(false);
 };

 const handleMarkAllAsRead = async (e: React.MouseEvent) => {
   e.preventDefault();
   await markAllAsRead();
 };

 const getNotificationIcon = (type: NotificationType) => {
   switch (type) {
     case 'comment':
       return '💬';
     case 'rating':
       return '⭐';
     case 'favorite':
       return '❤️';
     case 'new_video':
       return '🎥';
     case 'system':
       return '🔔';
     default:
       return '📝';
   }
 };

 return (
   <div ref={bellRef} className="relative">
     <button
       onClick={() => setIsOpen(!isOpen)}
       className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full"
       aria-label={`通知 ${unreadCount}件`}
     >
       <Bell className="h-6 w-6" />
       {unreadCount > 0 && (
         <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
           {unreadCount > 99 ? '99+' : unreadCount}
         </span>
       )}
     </button>

     {isOpen && (
       <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200">
         <div className="p-3 border-b border-gray-200 flex justify-between items-center">
           <h3 className="text-sm font-semibold text-gray-900">通知</h3>
           {unreadCount > 0 && (
             <button
               onClick={handleMarkAllAsRead}
               className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
             >
               <Check className="h-4 w-4" />
               すべて既読にする
             </button>
           )}
         </div>

         <div className="max-h-[32rem] overflow-y-auto">
           {notifications.length === 0 ? (
             <div className="p-4 text-center text-gray-500">
               通知はありません
             </div>
           ) : (
             notifications.slice(0, 10).map((notification) => (
               <Link
                 key={notification.id}
                 to={notification.link || '/profile/notifications'}
                 onClick={() => handleNotificationClick(notification)}
                 className={`
                   block p-4 hover:bg-gray-50 transition-colors duration-150 ease-in-out
                   ${notification.isRead ? 'bg-white' : 'bg-blue-50'}
                   border-b border-gray-100 last:border-b-0
                 `}
               >
                 <div className="flex gap-3">
                   <span className="text-xl" role="img" aria-label={notification.type}>
                     {getNotificationIcon(notification.type)}
                   </span>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-gray-900 truncate">
                       {notification.title}
                     </p>
                     <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                       {notification.message}
                     </p>
                     <div className="flex items-center justify-between mt-1">
                       <p className="text-xs text-gray-400">
                         {new Date(notification.createdAt).toLocaleString('ja-JP')}
                       </p>
                       {notification.priority === 'high' && (
                         <span className="text-xs text-red-500 font-medium">
                           重要
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
               </Link>
             ))
           )}
         </div>

         {notifications.length > 10 && (
           <Link
             to="/profile/notifications"
             onClick={() => setIsOpen(false)}
             className="block p-3 text-center text-sm text-indigo-600 hover:text-indigo-500 bg-gray-50 border-t border-gray-200"
           >
             すべての通知を見る
           </Link>
         )}
       </div>
     )}
   </div>
 );
}