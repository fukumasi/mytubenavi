import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '@/lib/supabase';
import type { Profile } from '@/types';
import ProfileLayout from './ProfileLayout';
import { ProfileAvatar } from './ProfileAvatar';
import { Link, useNavigate } from 'react-router-dom';
import useMediaQuery from '@/hooks/useMediaQuery';

const GENRE_OPTIONS = ['music', 'comedy', 'tech', 'gaming', 'news', 'sports'];

export default function UserProfile() {
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [channelUrl, setChannelUrl] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const userProfile = await getProfile();
        setProfileData(userProfile);
        setUsername(userProfile?.username || '');
        setDescription(userProfile?.description || '');
        setChannelUrl(userProfile?.channel_url || '');
        setBirthDate(userProfile?.birth_date || '');
        setInterests(userProfile?.interests || []);
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
          channel_url: channelUrl,
          birth_date: birthDate || null,
          interests,
        });
        setProfileData(prev => ({
          ...prev,
          username,
          description,
          channel_url: channelUrl,
          birth_date: birthDate,
          interests,
        } as Profile));
      }
      setIsEditing(false);
      setError(null);
      navigate('/profile/matching');
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('プロフィールの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    setInterests(prev =>
      checked ? [...prev, genre] : prev.filter(g => g !== genre)
    );
  };

  const mobileLinks = [
    { to: '/profile', label: 'プロフィール' },
    { to: '/profile/favorites', label: 'お気に入り' },
    { to: '/profile/reviews', label: '評価履歴' },
    { to: '/profile/history', label: '視聴履歴' },
    { to: '/profile/matching', label: 'おすすめ' },
    { to: '/profile/incoming-likes', label: 'いいねされた' },
    { to: '/profile/liked-users', label: 'いいねした' },
    { to: '/profile/match-history', label: 'マッチ履歴' },
    { to: '/profile/messages', label: 'メッセージ' },
    { to: '/profile/notifications', label: '通知' },
    { to: '/profile/notification-settings', label: '通知設定' },
    { to: '/profile/verification', label: 'アカウント認証' },
    { to: '/profile/settings', label: '設定' },
  ];

  if (isLoading) {
    return (
      <ProfileLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md mb-4">
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
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ユーザーネーム"
                  className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="自己紹介"
                  className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <input
                  type="url"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://www.youtube.com/channel/..."
                  className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">興味ジャンル</label>
                  <div className="flex flex-wrap gap-3">
                    {GENRE_OPTIONS.map((genre) => (
                      <label key={genre} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                        <input
                          type="checkbox"
                          value={genre}
                          checked={interests.includes(genre)}
                          onChange={(e) => handleGenreChange(genre, e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{genre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2">{profileData?.username}</h3>
                {profileData?.description && (
                  <p className="text-gray-500 dark:text-dark-text-secondary">{profileData.description}</p>
                )}
                {profileData?.birth_date && (
                  <p className="text-gray-500 dark:text-dark-text-secondary">生年月日: {profileData.birth_date}</p>
                )}
                {interests.length > 0 && (
                  <p className="text-gray-500 dark:text-dark-text-secondary">興味ジャンル: {interests.join(', ')}</p>
                )}
              </div>
            )}
          </div>
          <div>
            {isEditing ? (
              <div className="flex flex-col space-y-2">
                <button onClick={handleSaveProfile} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50" disabled={isLoading}>
                  {isLoading ? '保存中...' : '保存'}
                </button>
                <button onClick={() => {
                  setIsEditing(false);
                  setError(null);
                  setUsername(profileData?.username || '');
                  setDescription(profileData?.description || '');
                  setChannelUrl(profileData?.channel_url || '');
                  setBirthDate(profileData?.birth_date || '');
                  setInterests(profileData?.interests || []);
                }} className="border border-gray-300 dark:border-dark-border px-4 py-2 rounded-md text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-surface" disabled={isLoading}>
                  キャンセル
                </button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                編集
              </button>
            )}
          </div>
        </div>

        {isMobile && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-4">メニュー</h3>
            <div className="grid grid-cols-2 gap-4">
              {mobileLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block px-4 py-3 bg-gray-100 dark:bg-dark-border rounded-md text-center text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-dark-surface transition"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProfileLayout>
  );
}
