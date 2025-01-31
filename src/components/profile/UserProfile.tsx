import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../../lib/supabase';
import type { Profile } from '../../types';

export default function UserProfile() {
    const [profileData, setProfileData] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState<string>('');
    const [description, setDescription] = useState<string>('');


    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userProfile = await getProfile();
                setProfileData(userProfile);
                setUsername(userProfile?.username || '');
                setDescription(userProfile?.description || '');
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        fetchProfile();
    }, []);
    const handleSaveProfile = async () => {
      try {
          if(profileData) {
               await updateProfile({
                     ...profileData,
                    username,
                     description,
                });
                setProfileData(prev => ({ ...prev, username, description } as Profile))
          }

        setIsEditing(false);
        } catch (error) {
          console.error('Error saving profile:', error);
        }
    };
    
  return (
    <div className="bg-white shadow rounded-md p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">チャンネル設定</h2>
      
      <div className="flex items-center space-x-6 mb-6">
        <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden">
          <img
            src={profileData?.avatar_url}
            alt="プロフィール画像"
            className="w-full h-full object-cover"
           />
        </div>
        <div>
          {isEditing ? (
             <div>
              <input
                  type="text"
                  className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 placeholder="ユーザーネーム"
                />
                 <textarea
                  rows={4}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   placeholder="自己紹介"
                 />
             </div>

            ) : (
              <>
            <h3 className="text-lg font-medium text-gray-900 mb-1">{profileData?.username}</h3>
            {profileData?.description && <p className="text-gray-500">{profileData?.description}</p>}
              </>
            )}
           
        </div>
        
          {isEditing ? (
              <div className="flex space-x-2">
                  <button onClick={handleSaveProfile} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">保存</button>
                  <button  onClick={() => setIsEditing(false)} className="border border-gray-300 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-50">キャンセル</button>
              </div>
            ):(
                 <button onClick={() => setIsEditing(true)}  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">編集</button>
            )}
      </div>
       {isEditing ? null :(
        <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">チャンネルURL</h4>
            <p className="text-sm text-gray-700">{profileData?.channel_url}</p>
        </div>
      )}
        
    </div>
  );
}