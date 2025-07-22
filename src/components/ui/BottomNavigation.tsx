// src/components/ui/BottomNavigation.tsx

import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User } from 'lucide-react';

export default function BottomNavigation() {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, label: 'ホーム' },
    { to: '/search', icon: Search, label: '検索' },
    { to: '/profile/notifications', icon: Bell, label: '通知' },
    { to: '/profile', icon: User, label: 'マイページ' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-50 md:hidden">
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center text-xs ${
              isActive
                ? 'text-primary-500 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon className="h-6 w-6 mb-1" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
