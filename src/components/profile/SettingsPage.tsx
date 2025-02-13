// src/components/profile/SettingsPage.tsx

import { useState } from 'react';
import ProfileLayout from './ProfileLayout';
import { Moon, Bell, Lock, Globe, LogOut } from 'lucide-react';

interface Setting {
 id: string;
 title: string;
 description: string;
 type: 'toggle' | 'select' | 'button';
 value?: boolean | string;
 options?: string[];
 icon: React.ReactNode;
 action?: () => void;
}

export default function SettingsPage() {
 const [settings, setSettings] = useState<Setting[]>([
   {
     id: 'theme',
     title: 'ダークモード',
     description: 'ダークテーマに切り替える',
     type: 'toggle',
     value: false,
     icon: <Moon className="h-5 w-5" />
   },
   {
     id: 'notifications',
     title: 'プッシュ通知',
     description: 'ブラウザ通知を受け取る',
     type: 'toggle',
     value: true,
     icon: <Bell className="h-5 w-5" />
   },
   {
     id: 'privacy',
     title: 'プライバシー設定',
     description: 'プロフィールの公開範囲',
     type: 'select',
     value: 'public',
     options: ['public', 'private', 'friends'],
     icon: <Lock className="h-5 w-5" />
   },
   {
     id: 'language',
     title: '言語設定',
     description: 'インターフェースの言語',
     type: 'select',
     value: 'ja',
     options: ['ja', 'en', 'zh', 'ko'],
     icon: <Globe className="h-5 w-5" />
   },
   {
     id: 'logout',
     title: 'ログアウト',
     description: 'アカウントからログアウト',
     type: 'button',
     icon: <LogOut className="h-5 w-5" />,
     action: () => {
       // TODO: ログアウト処理
       console.log('Logout clicked');
     }
   }
 ]);

 const handleToggle = (settingId: string) => {
   setSettings(prevSettings =>
     prevSettings.map(setting =>
       setting.id === settingId && setting.type === 'toggle'
         ? { ...setting, value: !setting.value }
         : setting
     )
   );
 };

 const handleSelect = (settingId: string, value: string) => {
   setSettings(prevSettings =>
     prevSettings.map(setting =>
       setting.id === settingId && setting.type === 'select'
         ? { ...setting, value }
         : setting
     )
   );
 };

 const getDisplayValue = (setting: Setting) => {
   if (setting.type === 'select') {
     switch (setting.id) {
       case 'privacy':
         return {
           public: '公開',
           private: '非公開',
           friends: '友達のみ'
         }[setting.value as string] || setting.value;
       case 'language':
         return {
           ja: '日本語',
           en: 'English',
           zh: '中文',
           ko: '한국어'
         }[setting.value as string] || setting.value;
       default:
         return setting.value;
     }
   }
   return undefined;
 };

 return (
   <ProfileLayout>
     <div className="space-y-6">
       <h2 className="text-xl font-semibold text-gray-900">設定</h2>
       
       <div className="space-y-4">
         {settings.map(setting => (
           <div
             key={setting.id}
             className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm"
           >
             <div className="flex items-center space-x-4">
               <div className="text-gray-500">
                 {setting.icon}
               </div>
               <div>
                 <h3 className="text-sm font-medium text-gray-900">
                   {setting.title}
                 </h3>
                 <p className="text-sm text-gray-500">
                   {setting.description}
                 </p>
               </div>
             </div>

             {setting.type === 'toggle' && (
               <label className="relative inline-flex items-center cursor-pointer">
                 <input
                   type="checkbox"
                   className="sr-only peer"
                   checked={setting.value as boolean}
                   onChange={() => handleToggle(setting.id)}
                 />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
             )}

             {setting.type === 'select' && (
               <div className="flex items-center space-x-2">
                 <span className="text-sm text-gray-500">
                   {getDisplayValue(setting)}
                 </span>
                 <select
                   value={setting.value as string}
                   onChange={(e) => handleSelect(setting.id, e.target.value)}
                   className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                 >
                   {setting.options?.map(option => (
                     <option key={option} value={option}>
                       {getDisplayValue({ ...setting, value: option })}
                     </option>
                   ))}
                 </select>
               </div>
             )}

             {setting.type === 'button' && (
               <button
                 onClick={setting.action}
                 className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
               >
                 {setting.title}
               </button>
             )}
           </div>
         ))}
       </div>
     </div>
   </ProfileLayout>
 );
}