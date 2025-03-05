import { useEffect, useState } from 'react';
import { Bell, MessageSquare, Star, Eye, Mail, Smartphone, AlertCircle } from 'lucide-react';
import ProfileLayout from './ProfileLayout';
import { supabase } from '../../lib/supabase';
import { NotificationPreferences } from '../../types/notification';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationSetting {
  id: keyof NotificationPreferences['notificationTypes'] | 'emailNotifications' | 'pushNotifications' | 'inAppNotifications';
  type: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
  category: 'general' | 'email' | 'push';
}

const defaultSettings: NotificationSetting[] = [
  {
    id: 'newVideos',
    type: 'newVideos',
    title: '新着動画通知',
    description: 'お気に入りチャンネルの新着動画を通知',
    enabled: true,
    icon: <Bell className="h-5 w-5" />,
    category: 'general'
  },
  {
    id: 'reviews',
    type: 'reviews',
    title: 'コメント通知',
    description: 'あなたの投稿へのコメントを通知',
    enabled: true,
    icon: <MessageSquare className="h-5 w-5" />,
    category: 'general'
  },
  {
    id: 'ratings',
    type: 'ratings',
    title: '評価通知',
    description: 'あなたの投稿への評価を通知',
    enabled: false,
    icon: <Star className="h-5 w-5" />,
    category: 'general'
  },
  {
    id: 'favorites',
    type: 'favorites',
    title: 'お気に入り通知',
    description: 'お気に入り登録された時に通知',
    enabled: false,
    icon: <Eye className="h-5 w-5" />,
    category: 'general'
  },
  {
    id: 'emailNotifications',
    type: 'email',
    title: 'メール通知',
    description: '重要な通知をメールで受け取る',
    enabled: true,
    icon: <Mail className="h-5 w-5" />,
    category: 'email'
  },
  {
    id: 'pushNotifications',
    type: 'push',
    title: 'プッシュ通知',
    description: 'モバイルデバイスへのプッシュ通知',
    enabled: true,
    icon: <Smartphone className="h-5 w-5" />,
    category: 'push'
  },
  {
    id: 'inAppNotifications',
    type: 'inApp',
    title: 'アプリ内通知',
    description: 'アプリ内で通知を受け取る',
    enabled: true,
    icon: <Bell className="h-5 w-5" />,
    category: 'general'
  }
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("設定の取得エラー", error);
        // エラーが「レコードが見つからない」の場合
        if (error.code === 'PGRST116') {
          // 新しい設定を作成
          await createDefaultSettings();
          return;
        }
        throw error;
      }

      updateSettingsFromData(data);
    } catch (err) {
      console.error('設定の読み込みエラー:', err);
      setError('設定の読み込みに失敗しました。しばらく経ってから再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!user) return;

    try {
      const notificationTypes = {
        newVideos: true,
        reviews: true,
        ratings: false,
        favorites: false,
        mentions: false,
        follows: false,
        achievements: false,
        recommendations: false,
        milestones: false,
        subscriptions: false
      };

      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          email_notifications: true,
          push_notifications: true,
          in_app_notifications: true,
          notification_types: notificationTypes
        })
        .select()
        .single();

      if (error) throw error;
      if (data) updateSettingsFromData(data);
    } catch (err) {
      console.error("設定の作成エラー", err);
      setError('設定の作成に失敗しました。');
    }
  };

  const updateSettingsFromData = (data: any) => {
    if (!data) return;

    setSettings(prevSettings => prevSettings.map(setting => {
      if (setting.id === 'emailNotifications') {
        return { ...setting, enabled: data.email_notifications };
      } else if (setting.id === 'pushNotifications') {
        return { ...setting, enabled: data.push_notifications };
      } else if (setting.id === 'inAppNotifications') {
        return { ...setting, enabled: data.in_app_notifications };
      } else if (setting.category === 'general' && setting.id in (data.notification_types || {})) {
        return { ...setting, enabled: data.notification_types?.[setting.id] ?? setting.enabled };
      }
      return setting;
    }));
  };

  const handleToggle = async (settingId: NotificationSetting['id']) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (!user) throw new Error('認証されていません');

      // 設定を更新
      const updatedSettings = settings.map(setting =>
        setting.id === settingId ? { ...setting, enabled: !setting.enabled } : setting
      );
      setSettings(updatedSettings);

      // データベース用のデータを準備
      const emailNotifications = updatedSettings.find(s => s.id === 'emailNotifications')?.enabled ?? true;
      const pushNotifications = updatedSettings.find(s => s.id === 'pushNotifications')?.enabled ?? true;
      const inAppNotifications = updatedSettings.find(s => s.id === 'inAppNotifications')?.enabled ?? true;

      // 通知タイプの設定を抽出
      const notificationTypes: Record<string, boolean> = {};
      
      updatedSettings
        .filter(s => s.category === 'general' && s.id !== 'inAppNotifications')
        .forEach(setting => {
          notificationTypes[setting.id] = setting.enabled;
        });

      // データベースを更新
      const { error: updateError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email_notifications: emailNotifications,
          push_notifications: pushNotifications,
          in_app_notifications: inAppNotifications,
          notification_types: notificationTypes,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      setSuccessMessage('設定を更新しました');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      console.error('設定の更新エラー:', err);
      setError('設定の更新に失敗しました。しばらく経ってから再度お試しください。');
      // エラーが発生した場合、元の設定に戻す
      loadSettings();
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