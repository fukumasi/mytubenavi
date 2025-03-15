// src/components/youtuber/Register.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Youtube, Upload, Link as LinkIcon, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useYoutuberSync } from '@/hooks/useYoutuberSync';

const categories = [
  { id: 'music', name: '音楽' },
  { id: 'gaming', name: 'ゲーム' },
  { id: 'education', name: '教育' },
  { id: 'entertainment', name: 'エンターテイメント' },
  { id: 'tech', name: 'テクノロジー' },
  { id: 'lifestyle', name: 'ライフスタイル' },
  { id: 'vlog', name: 'ブログ' },
  { id: 'other', name: 'その他' }
];

export default function Register() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { syncChannel, syncStatus } = useYoutuberSync(); // useYoutuberSync フック
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    channelName: '',
    channelUrl: '',
    description: '',
    category: '',
    agreement: false
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [channelIdValid, setChannelIdValid] = useState(false);
  const [channelId, setChannelId] = useState('');

  // ローディング状態とエラーメッセージを syncStatus から取得
  const isLoading = ['syncing', 'loading'].includes(syncStatus.status);
  const syncError = syncStatus.status === 'error' ? syncStatus.message : null;

  useEffect(() => {
    if (currentUser?.user_metadata?.avatar_url) {
      setAvatarPreview(currentUser.user_metadata.avatar_url);
    }
  }, [currentUser]);

  // ユーザーがYouTuberとして既に登録されているか確認
  useEffect(() => {
    const checkYoutuberStatus = async () => {
      if (!currentUser) return;
      
      try {
        // プロフィールとYouTuberプロフィールの両方をチェック
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116は「結果が見つからない」エラーなので無視
          throw profileError;
        }
        
        const { data: youtuberData, error: youtuberError } = await supabase
          .from('youtuber_profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
          
        if (youtuberError && youtuberError.code !== 'PGRST116') {
          throw youtuberError;
        }
        
        if ((profileData && profileData.role === 'youtuber') || youtuberData) {
          // 既にYouTuberとして登録されている場合はダッシュボードにリダイレクト
          navigate('/youtuber/dashboard');
        }
      } catch (err) {
        console.error('Error checking youtuber status:', err);
      }
    };
    
    checkYoutuberStatus();
  }, [currentUser, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('画像サイズは5MB以下にしてください');
        return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // URLからチャンネルIDを抽出する関数
  const extractChannelId = (url: string): string | null => {
    let extractedId: string | null = null;
    
    // channel/[ID] 形式の場合
    const channelMatch = url.match(/youtube\.com\/channel\/([\w-]+)/);
    if (channelMatch && channelMatch[1]) {
      return channelMatch[1];
    }
    
    // c/[name] 形式の場合
    const cMatch = url.match(/youtube\.com\/c\/([\w-]+)/);
    if (cMatch) {
      return null; // この形式ではチャンネルIDを直接取得できない
    }
    
    // @username 形式の場合
    const atMatch = url.match(/youtube\.com\/@([\w-]+)/);
    if (atMatch) {
      return null; // この形式ではチャンネルIDを直接取得できない
    }
    
    // user/[name] 形式の場合
    const userMatch = url.match(/youtube\.com\/user\/([\w-]+)/);
    if (userMatch) {
      return null; // この形式ではチャンネルIDを直接取得できない
    }
    
    return extractedId;
  };

  // チャンネルURLの検証
  const validateChannelUrl = async (url: string) => {
    // 基本的なURL形式チェック
    const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeUrlPattern.test(url)) {
      setError('有効なYouTubeチャンネルURLを入力してください');
      setChannelIdValid(false);
      return false;
    }
    
    // チャンネルIDを抽出
    const extracted = extractChannelId(url);
    if (extracted) {
      setChannelId(extracted);
      setSuccess('チャンネルIDを正常に検出しました');
      setChannelIdValid(true);
      return true;
    } else {
      // IDが直接抽出できない場合は警告を表示するがブロックはしない
      setSuccess('');
      setError('チャンネルIDを直接抽出できません。同期処理で解決を試みます。');
      setChannelIdValid(false);
      return true; // 同期処理で解決を試みるため、trueを返す
    }
  };

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, channelUrl: url });
    setError('');
    setSuccess('');
    
    if (url) {
      await validateChannelUrl(url);
    } else {
      setChannelIdValid(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreement) {
      setError('利用規約に同意してください');
      return;
    }

    try {
      setError('');
      setLoading(true);

      if (!currentUser) {
        setError('ログインが必要です');
        return;
      }

      // 入力値の検証
      if (!formData.channelName.trim()) {
        setError('チャンネル名を入力してください');
        setLoading(false);
        return;
      }

      if (!formData.channelUrl.trim()) {
        setError('チャンネルURLを入力してください');
        setLoading(false);
        return;
      }

      if (!formData.category) {
        setError('カテゴリーを選択してください');
        setLoading(false);
        return;
      }

      // チャンネルURLの最終検証
      const isUrlValid = await validateChannelUrl(formData.channelUrl);
      if (!isUrlValid) {
        setLoading(false);
        return;
      }

      // 既に同じチャンネルURLで登録されていないか確認
      const { data: existingChannel, error: checkError } = await supabase
        .from('youtuber_profiles')
        .select('id')
        .eq('channel_url', formData.channelUrl);
        
      if (checkError) {
        console.error('Channel check error:', checkError);
      } else if (existingChannel && existingChannel.length > 0 && existingChannel[0].id !== currentUser.id) {
        setError('このチャンネルは既に他のユーザーによって登録されています');
        setLoading(false);
        return;
      }

      // チャンネル情報の同期。await で完了を待つ。
      await syncChannel(formData.channelUrl);

      // useYoutuberSync のエラーをチェック。
      if (syncStatus.status === 'error') {
        setError(syncStatus.message || 'チャンネル情報の同期に失敗しました。URLを確認してください。');
        setLoading(false);
        return; // エラーが発生したら、以降の処理を中断
      }

      let avatarUrl = currentUser.user_metadata?.avatar_url;

      // アバター画像のアップロード
      if (avatar) {
        const fileExt = avatar.name.split('.').pop();
        const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatar);

        if (uploadError) {
          throw uploadError;
        }

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      // プロフィール画像の更新
      if (avatarUrl) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            avatar_url: avatarUrl,
          }
        });

        if (updateError) throw updateError;
      }

      // トランザクション的に両方のテーブルを更新
      // 1. プロフィールテーブルの更新
      const { error: registerError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: currentUser.id,
            username: formData.channelName,
            channel_url: formData.channelUrl,
            description: formData.description,
            category: formData.category,
            role: 'youtuber',
            updated_at: new Date().toISOString()
          }
        ]);

      if (registerError) throw registerError;

      // 2. YouTuberプロファイルテーブルの更新
      const { error: youtuberProfileError } = await supabase
        .from('youtuber_profiles')
        .upsert([
          {
            id: currentUser.id,
            channel_id: channelId || null, // 抽出されたチャンネルIDがあれば使用
            channel_name: formData.channelName,
            channel_url: formData.channelUrl,
            channel_description: formData.description,
            category: formData.category,
            verification_status: 'pending',
            updated_at: new Date().toISOString()
          }
        ]);

      if (youtuberProfileError) {
        console.error('YouTuber profile registration error:', youtuberProfileError);
        throw youtuberProfileError;
      }

      // 3. ユーザーメタデータの更新
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          channel_name: formData.channelName,
          role: 'youtuber'
        }
      });
      
      if (metadataError) throw metadataError;

      // 登録完了、ダッシュボードへリダイレクト
      navigate('/youtuber/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(`登録に失敗しました: ${err.message || 'もう一度お試しください'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <Youtube className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">YouTuber登録</h2>
          <p className="mt-2 text-sm text-gray-600">
            YouTuberとして登録するにはログインが必要です
          </p>
        </div>
        <div className="mt-6 flex justify-center space-x-4">
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            ログイン
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            新規登録
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center mb-8">
          <Youtube className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">YouTuber登録</h2>
          <p className="mt-2 text-sm text-gray-600">
            チャンネル情報を入力して、YouTuberとして登録してください
          </p>
        </div>

        {/* エラーメッセージの表示 */}
        {(error || syncError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{error || syncError}</span>
            </div>
          </div>
        )}

        {/* 成功メッセージの表示 */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              <span className="text-sm">{success}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* アバター画像アップロード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              チャンネルアイコン
            </label>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Youtube className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-sm border border-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-gray-500" />
                  <input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <div className="text-sm text-gray-500">
                <p>推奨: 500x500ピクセル</p>
                <p>最大: 5MB</p>
              </div>
            </div>
          </div>

          {/* チャンネル名 */}
          <div>
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-700 mb-2">
              チャンネル名
            </label>
            <input
              type="text"
              id="channelName"
              value={formData.channelName}
              onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          {/* チャンネルURL */}
          <div>
            <label htmlFor="channelUrl" className="block text-sm font-medium text-gray-700 mb-2">
              チャンネルURL
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                <LinkIcon className="h-4 w-4" />
              </span>
              <input
                type="url"
                id="channelUrl"
                value={formData.channelUrl}
                onChange={handleUrlChange}
                className={`flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  channelIdValid ? 'border-green-500' : ''
                }`}
                placeholder="https://www.youtube.com/channel/..."
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              例: https://www.youtube.com/channel/UCxxxxxxxx (channel IDで始まるURLが最適です)
            </p>
          </div>

          {/* カテゴリー */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリー
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">カテゴリーを選択</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* チャンネル説明 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              チャンネル説明
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          {/* 利用規約同意 */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="agreement"
                type="checkbox"
                checked={formData.agreement}
                onChange={(e) => setFormData({ ...formData, agreement: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="ml-3">
              <label htmlFor="agreement" className="text-sm text-gray-600">
                <Link to="/terms" className="text-indigo-600 hover:text-indigo-500">
                  利用規約
                </Link>
                と
                <Link to="/privacy" className="text-indigo-600 hover:text-indigo-500">
                  プライバシーポリシー
                </Link>
                に同意します
              </label>
            </div>
          </div>

          {/* 送信ボタン */}
          <div>
            <button
              type="submit"
              disabled={loading || isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {(loading || isLoading) ? '処理中...' : 'YouTuberとして登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}