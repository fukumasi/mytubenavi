// src/components/profile/NotificationsPage.tsx

import { useState } from 'react';
import { Bell, MessageSquare, Star, Heart, Trash2, Check } from 'lucide-react';
import ProfileLayout from './ProfileLayout';
import { useNotifications } from '../../contexts/NotificationContext';
import { Notification, NotificationType } from '../../types/notification';

interface FilterOption {
 value: NotificationType | 'all';
 label: string;
 icon: JSX.Element;
}

const filterOptions: FilterOption[] = [
 { value: 'all', label: 'すべて', icon: <Bell className="h-4 w-4" /> },
 { value: 'comment', label: 'コメント', icon: <MessageSquare className="h-4 w-4" /> },
 { value: 'rating', label: '評価', icon: <Star className="h-4 w-4" /> },
 { value: 'favorite', label: 'お気に入り', icon: <Heart className="h-4 w-4" /> }
];

function NotificationItem({ 
 notification, 
 onMarkAsRead, 
 onDelete 
}: { 
 notification: Notification;
 onMarkAsRead: (id: string) => Promise<void>;
 onDelete: (id: string) => Promise<void>;
}) {
 const [isDeleting, setIsDeleting] = useState(false);
 const [isUpdating, setIsUpdating] = useState(false);

 const handleMarkAsRead = async (e: React.MouseEvent) => {
   e.preventDefault();
   if (notification.is_read) return;
   
   setIsUpdating(true);
   try {
     await onMarkAsRead(notification.id);
   } finally {
     setIsUpdating(false);
   }
 };

 const handleDelete = async (e: React.MouseEvent) => {
   e.preventDefault();
   e.stopPropagation();
   
   if (!window.confirm('この通知を削除してもよろしいですか？')) return;
   
   setIsDeleting(true);
   try {
     await onDelete(notification.id);
   } finally {
     setIsDeleting(false);
   }
 };

 return (
   <div
     className={`
       p-4 rounded-lg hover:shadow-md transition-all duration-200
       ${notification.is_read ? 'bg-white' : 'bg-blue-50'}
       ${notification.priority === 'high' ? 'border-l-4 border-red-500' : ''}
       ${isDeleting ? 'opacity-50' : ''}
     `}
   >
     <div className="flex items-start gap-4">
       {getNotificationIcon(notification.type)}
       <div className="flex-1 min-w-0">
         <h3 className="text-sm font-medium text-gray-900">
           {notification.title}
         </h3>
         <p className="text-sm text-gray-500 mt-1">
           {notification.message}
         </p>
         <div className="flex items-center justify-between mt-2">
           <p className="text-xs text-gray-400">
             {new Date(notification.created_at).toLocaleString('ja-JP')}
           </p>
           <div className="flex items-center gap-2">
             {!notification.is_read && (
               <button
                 onClick={handleMarkAsRead}
                 disabled={isUpdating}
                 className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
               >
                 <Check className="h-4 w-4" />
                 既読
               </button>
             )}
             <button
               onClick={handleDelete}
               disabled={isDeleting}
               className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
             >
               <Trash2 className="h-4 w-4" />
               削除
             </button>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
}

function getNotificationIcon(type: NotificationType) {
 switch (type) {
   case 'comment':
     return <MessageSquare className="h-5 w-5 text-blue-500" />;
   case 'rating':
     return <Star className="h-5 w-5 text-yellow-500" />;
   case 'favorite':
     return <Heart className="h-5 w-5 text-red-500" />;
   case 'new_video':
     return <Bell className="h-5 w-5 text-purple-500" />;
   default:
     return <Bell className="h-5 w-5 text-gray-500" />;
 }
}

export default function NotificationsPage() {
 const { 
   notifications, 
   loading, 
   error,
   markAsRead, 
   markAllAsRead, 
   deleteNotification,
   clearNotifications,
   filterNotifications 
 } = useNotifications();
 
 const [selectedFilter, setSelectedFilter] = useState<NotificationType | 'all'>('all');
 const [isClearing, setIsClearing] = useState(false);

 const filteredNotifications = selectedFilter === 'all' 
   ? notifications 
   : filterNotifications(selectedFilter);

 const handleClearAll = async () => {
   if (!window.confirm('既読の通知をすべて削除してもよろしいですか？')) return;
   
   setIsClearing(true);
   try {
     await clearNotifications();
   } finally {
     setIsClearing(false);
   }
 };

 if (loading) {
   return (
     <ProfileLayout>
       <div className="flex justify-center items-center h-64">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
       </div>
     </ProfileLayout>
   );
 }

 return (
   <ProfileLayout>
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h2 className="text-xl font-semibold text-gray-900">通知一覧</h2>
         <div className="flex items-center gap-4">
           {notifications.some(n => !n.is_read) && (
             <button
               onClick={() => markAllAsRead()}
               className="text-sm text-blue-600 hover:text-blue-800"
             >
               すべて既読にする
             </button>
           )}
           {notifications.some(n => n.is_read) && (
             <button
               onClick={handleClearAll}
               disabled={isClearing}
               className="text-sm text-gray-600 hover:text-gray-800"
             >
               既読の通知を削除
             </button>
           )}
         </div>
       </div>

       <div className="flex gap-2 overflow-x-auto pb-2">
         {filterOptions.map(option => (
           <button
             key={option.value}
             onClick={() => setSelectedFilter(option.value)}
             className={`
               flex items-center gap-2 px-4 py-2 rounded-full text-sm
               ${selectedFilter === option.value
                 ? 'bg-indigo-100 text-indigo-700'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
               }
             `}
           >
             {option.icon}
             {option.label}
           </button>
         ))}
       </div>

       {error && (
         <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
           {error}
         </div>
       )}

       <div className="space-y-4">
         {filteredNotifications.length === 0 ? (
           <p className="text-center text-gray-500 py-8">通知はありません</p>
         ) : (
           filteredNotifications.map(notification => (
             <NotificationItem
               key={notification.id}
               notification={notification}
               onMarkAsRead={markAsRead}
               onDelete={deleteNotification}
             />
           ))
         )}
       </div>
     </div>
   </ProfileLayout>
 );
}