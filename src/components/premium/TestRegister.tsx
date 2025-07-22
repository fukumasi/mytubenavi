// src/pages/premium/TestRegister.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function TestRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTestRegister = async () => {
    if (!user) {
      setErrorMessage('ログインが必要です。');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', user.id);

    if (error) {
      setErrorMessage('登録に失敗しました。再度お試しください。');
    } else {
      // ✅ プロフィール設定ページへ遷移
      navigate('/profile/settings');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold mb-6 text-center">プレミアム テスト登録</h1>

      <p className="mb-4 text-sm text-gray-600 text-center">
        テスト目的でプレミアム会員機能を有効化します。
        登録後はプロフィール設定ページへ移動します。
      </p>

      {errorMessage && (
        <div className="text-red-500 text-sm text-center mb-4">{errorMessage}</div>
      )}

      <div className="flex justify-center">
        <button
          onClick={handleTestRegister}
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'テスト登録する'}
        </button>
      </div>
    </div>
  );
}
