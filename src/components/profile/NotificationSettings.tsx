// src/components/profile/NotificationSettings.tsx
import { useEffect, useState } from 'react';
import { Bell, MessageSquare, Star, Mail, Smartphone, AlertCircle, Heart, UserPlus, Trophy, TrendingUp } from 'lucide-react';
import ProfileLayout from './ProfileLayout';
import { NotificationPreference } from '../../types/notification';
import { useNotificationManager } from '../../hooks/useNotificationManager';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationSetting {
  id: keyof NotificationPreference;
  title: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
  category: 'general' | 'email' | 'push';
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const { preferences, updatePreferences } = useNotificationManager();

  useEffect(() => {
    if (preferences) {
      const newSettings: NotificationSetting[] = [
        {
          id: 'video_comments',
          title: '動画コメント通知',
          description: 'あなたの動画に新しいコメントが投稿された時',
          enabled: preferences.video_comments,
          icon: <MessageSquare className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'review_replies',
          title: 'レビュー返信通知',
          description: 'あなたのレビューに返信があった時',
          enabled: preferences.review_replies,
          icon: <MessageSquare className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'likes',
          title: 'いいね通知',
          description: 'あなたの投稿にいいねがついた時',
          enabled: preferences.likes,
          icon: <Heart className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'follows',
          title: 'フォロー通知',
          description: '新しいフォロワーがいた時',
          enabled: preferences.follows,
          icon: <UserPlus className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'system_notifications',
          title: 'システム通知',
          description: 'サービスのアップデートやお知らせ',
          enabled: preferences.system_notifications,
          icon: <Bell className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'new_videos',
          title: '新着動画通知',
          description: 'お気に入りチャンネルの新着動画を通知',
          enabled: preferences.new_videos,
          icon: <Bell className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'ratings',
          title: '評価通知',
          description: 'あなたの投稿への評価を通知',
          enabled: preferences.ratings || false,
          icon: <Star className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'favorites',
          title: 'お気に入り通知',
          description: 'お気に入り登録された時に通知',
          enabled: preferences.favorites || false,
          icon: <Heart className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'mentions',
          title: 'メンション通知',
          description: 'あなたがメンションされた時に通知',
          enabled: preferences.mentions || false,
          icon: <MessageSquare className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'achievements',
          title: '実績通知',
          description: '新しい実績を獲得した時に通知',
          enabled: preferences.achievements || false, 
          icon: <Trophy className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'recommendations',
          title: 'おすすめ通知',
          description: 'あなたに合ったおすすめコンテンツの通知',
          enabled: preferences.recommendations || false,
          icon: <TrendingUp className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'milestones',
          title: 'マイルストーン通知',
          description: '特定の利用実績に達した時の通知',
          enabled: preferences.milestones || false,
          icon: <Trophy className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'subscriptions',
          title: '購読通知',
          description: '購読関連の通知',
          enabled: preferences.subscriptions || false,
          icon: <Bell className="h-5 w-5" />,
          category: 'general'
        },
        {
          id: 'email_notifications',
          title: 'メール通知',
          description: '重要な通知をメールで受け取る',
          enabled: preferences.email_notifications,
          icon: <Mail className="h-5 w-5" />,
          category: 'email'
        },
        {
          id: 'push_notifications',
          title: 'プッシュ通知',
          description: 'モバイルデバイスへのプッシュ通知',
          enabled: preferences.push_notifications,
          icon: <Smartphone className="h-5 w-5" />,
          category: 'push'
        },
        {
          id: 'in_app_notifications',
          title: 'アプリ内通知',
          description: 'アプリ内で通知を受け取る',
          enabled: preferences.in_app_notifications || true,
          icon: <Bell className="h-5 w-5" />,
          category: 'general'
        }
      ];

      setSettings(newSettings);
      setLoading(false);
    }
  }, [preferences]);

  const handleToggle = async (settingId: keyof NotificationPreference) => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // 設定を更新
      const updatedSettings = settings.map(setting =>
        setting.id === settingId ? { ...setting, enabled: !setting.enabled } : setting
      );
      setSettings(updatedSettings);

      // データベース用のデータを準備
      const updatedPreferences: Partial<NotificationPreference> = {};
      
      // 型安全な方法で設定値を割り当て
      updatedSettings.forEach(setting => {
        // TypeScriptの型チェックを満たすために、型アサーションを使用
        (updatedPreferences as any)[setting.id] = setting.enabled;
      });

      // データベースを更新
      await updatePreferences(updatedPreferences);

      setSuccessMessage('設定を更新しました');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      console.error('設定の更新エラー:', err);
      setError('設定の更新に失敗しました。しばらく経ってから再度お試しください。');
      
      // エラーが発生した場合は、元の状態に戻す
      if (preferences) {
        const originalSettings = settings.map(setting => {
          // 元の値を取得
          const originalValue = (preferences as any)[setting.id];
          return {
            ...setting,
            // undefined の場合はデフォルト値を使用
            enabled: originalValue !== undefined ? originalValue : setting.enabled
          };
        });
        setSettings(originalSettings);
      }
    } finally {
      setSaving(false);
    }
  };

  const renderSettingsByCategory = (category: 'general' | 'email' | 'push') => {
    return settings
      .filter(setting => setting.category === category)
      .map(setting => (
        <div
          key={setting.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
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

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={setting.enabled}
              onChange={() => handleToggle(setting.id)}
              disabled={saving}
            />
            <div className={`
              w-11 h-6 bg-gray-200
              peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300
              rounded-full peer
              peer-checked:after:translate-x-full
              peer-checked:after:border-white
              after:content-['']
              after:absolute
              after:top-[2px]
              after:left-[2px]
              after:bg-white
              after:border-gray-300
              after:border
              after:rounded-full
              after:h-5
              after:w-5
              after:transition-all
              peer-checked:bg-blue-600
              ${saving ? 'opacity-50 cursor-not-allowed' : ''}
            `}></div>
          </label>
        </div>
      ));
  };

  if (loading) {
    return (
      <ProfileLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">通知設定</h2>
          {saving && (
            <p className="text-sm text-gray-600">保存中...</p>
          )}
          {error && (
            <div className="flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </div>
          )}
          {successMessage && (
            <p className="text-sm text-green-600">{successMessage}</p>
          )}
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">一般通知</h3>
            <div className="space-y-4">
              {renderSettingsByCategory('general')}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">メール通知</h3>
            <div className="space-y-4">
              {renderSettingsByCategory('email')}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">プッシュ通知</h3>
            <div className="space-y-4">
              {renderSettingsByCategory('push')}
            </div>
          </section>
        </div>
      </div>
    </ProfileLayout>
  );
}