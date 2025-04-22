import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MenuItemProps {
  label: string;
  icon?: ReactNode;
  path: string;
  count?: number;
}

const menuItems: MenuItemProps[] = [
  { label: 'プロフィール', path: '/profile' },
  { label: '口コミ・評価履歴', path: '/profile/reviews' },
  { label: 'お気に入り動画', path: '/profile/favorites' },
  { label: '視聴履歴', path: '/profile/history' },
  { label: '新着通知', path: '/profile/notifications' },
  { label: '通知設定', path: '/profile/notification-settings' },
];

interface ProfileLayoutProps {
  children: ReactNode;
}

const ProfileLayout: React.FC<ProfileLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const renderMenuItem = (item: MenuItemProps) => {
    const isActive = location.pathname === item.path;
    
    return (
      <button
        key={item.path}
        onClick={() => handleMenuClick(item.path)}
        className={`w-full text-left px-4 py-3 flex items-center justify-between rounded-lg transition-colors
          ${isActive 
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
            : 'hover:bg-gray-100 dark:hover:bg-dark-surface'
          }`}
      >
        <div className="flex items-center gap-3">
          {item.icon}
          <span>{item.label}</span>
        </div>
        {item.count !== undefined && (
          <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-2 py-1 rounded-full">
            {item.count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-20">
            <nav className="space-y-1">
              {menuItems.map(renderMenuItem)}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow dark:shadow-none dark:border dark:border-dark-border p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileLayout;