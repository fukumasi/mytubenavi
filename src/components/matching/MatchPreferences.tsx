// src/components/matching/MatchPreferences.tsx

import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { toast, Toaster } from 'react-hot-toast';
import useMatching from '../../hooks/useMatching';
import { supabase } from '../../lib/supabase';
import { MatchingPreferences } from '../../types/matching';

interface MatchPreferencesProps {
  onClose: () => void;
}

// 都道府県リスト
const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

// 活動レベルのオプション
const ACTIVITY_LEVELS = [
  { value: 'very_active', label: '非常に活発' },
  { value: 'active', label: '活発' },
  { value: 'moderate', label: '普通' },
  { value: 'casual', label: 'カジュアル' }
];

const MatchPreferences: React.FC<MatchPreferencesProps> = ({ onClose }) => {
  const { 
    loadingPreferences,
    processingAction,
    preferences,
    fetchPreferences,
    savePreferences
  } = useMatching();
  
  const [localPreferences, setLocalPreferences] = useState<MatchingPreferences>({
    gender_preference: 'any',
    age_range_min: 18,
    age_range_max: 99,
    location_preference: {},
    interest_tags: [],
    genre_preference: [],
    activity_level: 'moderate',
    online_only: false,
    premium_only: false,
    has_video_history: false,
    recent_activity: false,
    filter_skipped: true
  });
  
  const [genres, setGenres] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [newInterest, setNewInterest] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [remainingPoints, setRemainingPoints] = useState<number>(0);
  const [isFilterCostApplied, setIsFilterCostApplied] = useState<boolean>(false);

  useEffect(() => {
    fetchPreferences();
    fetchGenres();
    fetchUserPoints();
  }, [fetchPreferences]);

  // preferences が更新されたら localPreferences も更新
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  // 詳細フィルター選択時のポイント消費をチェック
  useEffect(() => {
    // プレミアム会員はフィルターコスト無料
    const isPremium = localStorage.getItem('is_premium') === 'true';
    const detailedFilterActive = 
      (localPreferences.online_only === true) || 
      (localPreferences.premium_only === true) || 
      (localPreferences.has_video_history === true) || 
      (localPreferences.recent_activity === true);
      
    setIsFilterCostApplied(detailedFilterActive && !isPremium);
  }, [localPreferences]);

  const fetchUserPoints = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      const { data, error } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', userData.user.id)
        .single();

      if (error) throw error;
      setRemainingPoints(data?.balance || 0);
    } catch (error) {
      console.error('ポイント情報の取得に失敗しました:', error);
    }
  };

  const fetchGenres = async () => {
    try {
      const { data, error } = await supabase
        .from('genres')
        .select('id, name, parent_id')
        .order('name');

      if (error) throw error;
      setGenres(data || []);
    } catch (error) {
      console.error('ジャンルの取得に失敗しました:', error);
      toast.error('ジャンルの読み込みに失敗しました');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'age_range_min' || name === 'age_range_max') {
      const numValue = parseInt(value);
      setLocalPreferences(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else {
      setLocalPreferences(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setLocalPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setLocalPreferences(prev => ({
      ...prev,
      location_preference: {
        ...prev.location_preference,
        prefecture: value
      }
    }));
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setLocalPreferences(prev => {
      const updatedGenres = checked
        ? [...prev.genre_preference, value]
        : prev.genre_preference.filter(g => g !== value);
      
      return {
        ...prev,
        genre_preference: updatedGenres
      };
    });
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !localPreferences.interest_tags.includes(newInterest.trim())) {
      const updatedInterests = [...localPreferences.interest_tags, newInterest.trim()];
      setLocalPreferences(prev => ({
        ...prev,
        interest_tags: updatedInterests
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    const updatedInterests = localPreferences.interest_tags.filter(i => i !== interest);
    setLocalPreferences(prev => ({
      ...prev,
      interest_tags: updatedInterests
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // 年齢範囲のバリデーション
      if (localPreferences.age_range_min > localPreferences.age_range_max) {
        toast.error('最小年齢は最大年齢より小さくしてください');
        setSaving(false);
        return;
      }

      // 詳細フィルター使用時のポイントチェック
      if (isFilterCostApplied && remainingPoints < 3) {
        toast.error('詳細フィルターの使用には3ポイント必要です。ポイントが不足しています。');
        setSaving(false);
        return;
      }

      const success = await savePreferences(localPreferences);
      if (success) {
        if (isFilterCostApplied) {
          // ポイント消費を記録 (実際のポイント消費処理はバックエンド側で行われる想定)
          toast.success('設定を保存しました（詳細フィルター: -3ポイント）');
        } else {
          toast.success('設定を保存しました');
        }
        onClose();
      }
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPreferences) {
    return <LoadingSpinner />;
  }

  // 親ジャンルごとに子ジャンルをグループ化
  const parentGenres = genres.filter(g => !g.parent_id);
  const childGenresByParent = parentGenres.map(parent => ({
    parent,
    children: genres.filter(g => g.parent_id === parent.id)
  }));

  // プレミアム会員表示
  const isPremium = localStorage.getItem('is_premium') === 'true';

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">マッチング設定</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 性別設定 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            相手の性別
          </label>
          <select
            name="gender_preference"
            value={localPreferences.gender_preference}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            <option value="any">指定なし</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
          </select>
        </div>

        {/* 年齢設定 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            年齢範囲
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              name="age_range_min"
              min="18"
              max="99"
              value={localPreferences.age_range_min}
              onChange={handleInputChange}
              className="w-24 p-3 border border-gray-300 rounded-lg"
            />
            <span>〜</span>
            <input
              type="number"
              name="age_range_max"
              min="18"
              max="99"
              value={localPreferences.age_range_max}
              onChange={handleInputChange}
              className="w-24 p-3 border border-gray-300 rounded-lg"
            />
            <span>歳</span>
          </div>
        </div>

        {/* 地域設定 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            地域
          </label>
          <select
            value={localPreferences.location_preference?.prefecture || ''}
            onChange={handleLocationChange}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            <option value="">指定なし</option>
            {PREFECTURES.map(prefecture => (
              <option key={prefecture} value={prefecture}>
                {prefecture}
              </option>
            ))}
          </select>
        </div>

        {/* 活動レベル */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            活動レベル
          </label>
          <select
            name="activity_level"
            value={localPreferences.activity_level}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            {ACTIVITY_LEVELS.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* 詳細フィルター設定 */}
        <div className="mb-6 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-gray-700 font-semibold">
              詳細フィルター
            </label>
            {!isPremium && (
              <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                3ポイント/日 (残り: {remainingPoints}ポイント)
              </span>
            )}
            {isPremium && (
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                プレミアム会員: 無料
              </span>
            )}
          </div>
          
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="online_only"
                checked={localPreferences.online_only || false}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <span>オンラインのユーザーのみ表示</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="premium_only"
                checked={localPreferences.premium_only || false}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <span>プレミアムユーザーのみ表示</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="has_video_history"
                checked={localPreferences.has_video_history || false}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <span>視聴履歴のあるユーザーのみ表示</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="recent_activity"
                checked={localPreferences.recent_activity || false}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <span>最近活動したユーザーのみ表示（1週間以内）</span>
            </label>
          </div>
        </div>

        {/* スキップしたユーザーの扱い */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="filter_skipped"
              checked={localPreferences.filter_skipped || false}
              onChange={handleCheckboxChange}
              className="mr-2"
            />
            <span>以前スキップしたユーザーを表示しない</span>
          </label>
        </div>

        {/* 興味・関心 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            興味・関心
          </label>
          <div className="flex mb-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-l-lg"
              placeholder="新しい興味を追加"
            />
            <button
              type="button"
              onClick={handleAddInterest}
              className="px-4 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600"
            >
              追加
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {localPreferences.interest_tags.map((interest, index) => (
              <div key={index} className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
                <span className="text-blue-800">{interest}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(interest)}
                  className="ml-2 text-blue-800 hover:text-blue-900"
                >
                  &times;
                </button>
              </div>
            ))}
            {localPreferences.interest_tags.length === 0 && (
              <span className="text-gray-500">興味・関心を追加してください</span>
            )}
          </div>
        </div>

        {/* 好みのジャンル */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            好みのジャンル
          </label>
          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4">
            {childGenresByParent.map(({ parent, children }) => (
              <div key={parent.id} className="mb-4">
                <h3 className="font-semibold mb-2">{parent.name}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {children.map(genre => (
                    <label key={genre.id} className="flex items-center">
                      <input
                        type="checkbox"
                        value={genre.id}
                        checked={localPreferences.genre_preference.includes(genre.id)}
                        onChange={handleGenreChange}
                        className="mr-2"
                      />
                      <span className="text-sm">{genre.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ポイント消費の警告 */}
        {isFilterCostApplied && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span>詳細フィルターを使用すると、<strong>3ポイント</strong>消費します（プレミアム会員は無料）</span>
            </div>
          </div>
        )}

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 mr-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
            disabled={saving || processingAction}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            disabled={saving || processingAction}
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchPreferences;