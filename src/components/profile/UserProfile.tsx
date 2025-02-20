// src/components/profile/UserProfile.tsx
import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../../lib/supabase';
import type { Profile } from '../../types';
import ProfileLayout from './ProfileLayout';
import { ProfileAvatar } from './ProfileAvatar';

export default function UserProfile() {
    const [profileData, setProfileData] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [channelUrl, setChannelUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const userProfile = await getProfile();
                setProfileData(userProfile);
                setUsername(userProfile?.username || '');
                setDescription(userProfile?.description || '');
                setChannelUrl(userProfile?.channel_url || '');
            } catch (error) {
                console.error('Error fetching profile:', error);
                setError('プロフィールの読み込みに失敗しました');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleAvatarUpload = async (url: string) => {
        try {
            if (profileData) {
                await updateProfile({
                    ...profileData,
                    avatar_url: url
                });
                setProfileData(prev => ({ ...prev, avatar_url: url } as Profile));
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            setError('プロフィール画像の更新に失敗しました');
        }
    };

    const handleSaveProfile = async () => {
        try {
            if (!username.trim()) {
                setError('ユーザーネームは必須です');
                return;
            }

            setIsLoading(true);
            if (profileData) {
                await updateProfile({
                    ...profileData,
                    username,
                    description,
                    channel_url: channelUrl
                });
                setProfileData(prev => ({ ...prev, username, description, channel_url: channelUrl } as Profile));
            }
            setIsEditing(false);
            setError(null);
        } catch (error) {
            console.error('Error saving profile:', error);
            setError('プロフィールの保存に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <ProfileLayout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </ProfileLayout>
        );
    }
    
    const ProfileContent = (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
                    {error}
                </div>
            )}
            <div className="flex items-center space-x-6">
                <ProfileAvatar
                    url={profileData?.avatar_url}
                    onUpload={handleAvatarUpload}
                    size={96}
                />
                <div className="flex-1">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ユーザーネーム*
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="ユーザーネーム"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    自己紹介
                                </label>
                                <textarea
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="自己紹介"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    チャンネルURL
                                </label>
                                <input
                                    type="url"
                                    className="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={channelUrl}
                                    onChange={(e) => setChannelUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/channel/..."
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{profileData?.username}</h3>
                            {profileData?.description && (
                                <p className="text-gray-500">{profileData?.description}</p>
                            )}
                        </div>
                    )}
                </div>
                <div>
                    {isEditing ? (
                        <div className="flex flex-col space-y-2">
                            <button 
                                onClick={handleSaveProfile} 
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                disabled={isLoading}
                            >
                                {isLoading ? '保存中...' : '保存'}
                            </button>
                            <button 
                                onClick={() => {
                                    setIsEditing(false);
                                    setError(null);
                                    setUsername(profileData?.username || '');
                                    setDescription(profileData?.description || '');
                                    setChannelUrl(profileData?.channel_url || '');
                                }} 
                                className="border border-gray-300 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-50"
                                disabled={isLoading}
                            >
                                キャンセル
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsEditing(true)}  
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            disabled={isLoading}
                        >
                            編集
                        </button>
                    )}
                </div>
            </div>
            
            {!isEditing && profileData?.channel_url && (
                <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">チャンネルURL</h4>
                    <a 
                        href={profileData.channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-500 break-all"
                    >
                        {profileData.channel_url}
                    </a>
                </div>
            )}
        </div>
    );

    return (
        <ProfileLayout>
            {ProfileContent}
        </ProfileLayout>
    );
}