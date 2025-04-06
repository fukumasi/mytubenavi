import { Home, Compass, Star, Users, Calendar, Settings, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const navigation = [
  { name: 'ホーム', icon: Home, path: '/' },
  { name: 'ジャンル', icon: Compass, path: '/genre' },
  { name: 'お気に入り', icon: Star, path: '/favorites' },
  { name: 'マッチング', icon: Users, path: '/matching' },
  { name: 'イベント', icon: Calendar, path: '/events' },
];

const bottomNav = [
  { name: '設定', icon: Settings, path: '/settings' },
  { name: 'ヘルプ', icon: HelpCircle, path: '/help' },
];

export default function Sidebar() {
  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow pt-20 pb-4 overflow-y-auto bg-white border-r border-gray-200">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full"
              >
                <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="mt-auto">
            {bottomNav.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="group flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full"
              >
                <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}