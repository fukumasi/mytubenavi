// src/components/matching/MatchPreferences.tsx

import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast, Toaster } from 'react-hot-toast';
import useMatching from '@/hooks/useMatching';
import usePoints from '@/hooks/usePoints';
import { 
  MatchingPreferences, 
  ActivityLevel, 
  GenderPreference 
} from '@/types/matching';

interface MatchPreferencesProps {
  onClose: () => void;
  verificationLevel?: number; // 検証レベルを受け取るプロパティ
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
  { value: ActivityLevel.VERY_ACTIVE, label: '非常に活発' },
  { value: ActivityLevel.ACTIVE, label: '活発' },
  { value: ActivityLevel.MODERATE, label: '普通' },
  { value: ActivityLevel.CASUAL, label: 'カジュアル' }
];

// 検索半径のオプション
const DISTANCE_OPTIONS = [
  { value: 0, label: '指定なし' },
  { value: 10, label: '10km以内' },
  { value: 30, label: '30km以内' },
  { value: 50, label: '50km以内' },
  { value: 100, label: '100km以内' }
];

// 共通趣味数のオプション
const COMMON_INTERESTS_OPTIONS = [
  { value: 0, label: '指定なし' },
  { value: 1, label: '1つ以上' },
  { value: 2, label: '2つ以上' },
  { value: 3, label: '3つ以上' },
  { value: 5, label: '5つ以上' }
];

// フィルターのポイントコスト
const FILTER_POINT_COST = 3;

const MatchPreferences: React.FC<MatchPreferencesProps> = ({ onClose, verificationLevel = 2 }) => {
  const { 
    loadingPreferences,
    processingAction,
    preferences,
    fetchPreferences,
    savePreferences
  } = useMatching();
  
  // usePointsフックを使用
  const { 
    balance,
    loading: pointsLoading,
    consumePoints,
    hasEnoughPoints,
    isPremium,
    
  } = usePoints();
  
  const [localPreferences, setLocalPreferences] = useState<MatchingPreferences>({
    gender_preference: GenderPreference.ANY,
    age_range_min: 18,
    age_range_max: 99,
    location_preference: {},
    interest_tags: [],
    genre_preference: [],
    activity_level: ActivityLevel.MODERATE,
    online_only: false,
    premium_only: false,
    has_video_history: false,
    recent_activity: false,
    filter_skipped: false,
    exclude_liked_users: true, // デフォルトではいいね済みユーザーを除外
    min_common_interests: 0,
    max_distance: 0
  });
  
  const [newInterest, setNewInterest] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [isFilterCostApplied, setIsFilterCostApplied] = useState<boolean>(false);
  const [searchMode, setSearchMode] = useState<'normal' | 'relaxed'>('normal');
  const [lastUsedFilter, setLastUsedFilter] = useState<MatchingPreferences | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // preferences が更新されたら localPreferences も更新
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        ...preferences,
        // デフォルト値が未設定の場合に設定
        min_common_interests: preferences.min_common_interests ?? 0,
        max_distance: preferences.max_distance ?? 0,
        filter_skipped: preferences.filter_skipped ?? false,
        exclude_liked_users: preferences.exclude_liked_users !== false
      });
      
      // 前回使用したフィルター設定を保存
      setLastUsedFilter({
        ...preferences,
        min_common_interests: preferences.min_common_interests ?? 0,
        max_distance: preferences.max_distance ?? 0,
        filter_skipped: preferences.filter_skipped ?? false,
        exclude_liked_users: preferences.exclude_liked_users !== false
      });
      
      // 初期ロード時は変更フラグをリセット
      setHasUnsavedChanges(false);
    }
  }, [preferences]);

  // 詳細フィルター選択時のポイント消費をチェック
  useEffect(() => {
    const detailedFilterActive = 
      (localPreferences.online_only === true) || 
      (localPreferences.premium_only === true) || 
      (localPreferences.has_video_history === true) || 
      (localPreferences.recent_activity === true) ||
      ((localPreferences.min_common_interests ?? 0) > 0) ||
      ((localPreferences.max_distance ?? 0) > 0);
      
    setIsFilterCostApplied(detailedFilterActive && !isPremium && searchMode !== 'relaxed');
  }, [localPreferences, isPremium, searchMode]);

  // 設定変更をマークする関数
  const markAsChanged = () => {
    setHasUnsavedChanges(true);
    // 緩和モード中の変更は通常モードに戻す
    if (searchMode === 'relaxed') {
      setSearchMode('normal');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'age_range_min' || name === 'age_range_max' || name === 'min_common_interests' || name === 'max_distance') {
      const numValue = parseInt(value);
      setLocalPreferences(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else if (name === 'gender_preference') {
      setLocalPreferences(prev => ({
        ...prev,
        [name]: value as GenderPreference
      }));
    } else if (name === 'activity_level') {
      setLocalPreferences(prev => ({
        ...prev,
        [name]: value as ActivityLevel
      }));
    } else {
      setLocalPreferences(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    markAsChanged();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setLocalPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
    
    markAsChanged();
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
    
    markAsChanged();
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !localPreferences.interest_tags.includes(newInterest.trim())) {
      const updatedInterests = [...localPreferences.interest_tags, newInterest.trim()];
      setLocalPreferences(prev => ({
        ...prev,
        interest_tags: updatedInterests
      }));
      setNewInterest('');
      
      markAsChanged();
    }
  };

  const handleRemoveInterest = (interest: string) => {
    const updatedInterests = localPreferences.interest_tags.filter(i => i !== interest);
    setLocalPreferences(prev => ({
      ...prev,
      interest_tags: updatedInterests
    }));
    
    markAsChanged();
  };

  const applyRelaxedMode = () => {
    // 前回の設定を保存
    if (searchMode !== 'relaxed') {
      setLastUsedFilter({...localPreferences});
    }
    
    setSearchMode('relaxed');
    setLocalPreferences(prev => ({
      ...prev,
      gender_preference: GenderPreference.ANY,
      age_range_min: 18,
      age_range_max: 99,
      location_preference: {},
      activity_level: ActivityLevel.MODERATE,
      online_only: false,
      premium_only: false,
      has_video_history: false,
      recent_activity: false,
      filter_skipped: false,
      exclude_liked_users: false, // 緩和モードではいいね済みユーザーも表示
      min_common_interests: 0,
      max_distance: 0
    }));
    
    toast.success('緩和モードを適用しました。より多くのマッチング候補が表示されるようになります。');
    setHasUnsavedChanges(true); // 緩和モード適用も変更としてマーク
  };
  
  const restoreNormalMode = () => {
    if (lastUsedFilter) {
      setLocalPreferences(lastUsedFilter);
    }
    setSearchMode('normal');
    toast.success('通常モードに戻しました。以前の設定が復元されました。');
    setHasUnsavedChanges(true); // 通常モード復帰も変更としてマーク
  };

  // 変更を破棄して閉じる
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      // 未保存の変更がある場合は確認する
      if (window.confirm('変更を破棄してよろしいですか？')) {
        onClose();
      }
    } else {
      onClose();
    }
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

      // 検証レベルチェック（テスト完了につき有効化）
      if (verificationLevel < 2) {
        toast.error('電話番号認証が必要です。マッチング機能を利用するには、プロフィール設定から認証レベルをアップグレードしてください。');
        setSaving(false);
        return;
      }

      // 詳細フィルター使用時のポイントチェック
      if (isFilterCostApplied) {
        if (!hasEnoughPoints(FILTER_POINT_COST)) {
          toast.error(`詳細フィルターの使用には${FILTER_POINT_COST}ポイント必要です。ポイントが不足しています。`);
          setSaving(false);
          return;
        }
        
        // ポイント消費処理
        const deductSuccess = await consumePoints(
          FILTER_POINT_COST, 
          'filter_usage', 
          undefined, 
          '詳細マッチングフィルター使用'
        );
        
        if (!deductSuccess) {
          toast.error('ポイント消費処理に失敗しました。');
          setSaving(false);
          return;
        }
      }

      const success = await savePreferences(localPreferences);
      if (success) {
        if (isFilterCostApplied) {
          toast.success(`設定を保存しました（詳細フィルター: -${FILTER_POINT_COST}ポイント）`);
        } else {
          toast.success('設定を保存しました');
        }
        setHasUnsavedChanges(false); // 保存成功したら変更フラグをリセット
        onClose();
      } else {
        toast.error('設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPreferences || pointsLoading) {
    return <LoadingSpinner />;
  }

  // 検証レベルに基づく警告（テスト完了につき実際の条件に修正）
  const showVerificationWarning = verificationLevel < 2; // 元の条件に戻す

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">マッチング設定</h2>
        <div className="flex items-center">
          {searchMode === 'relaxed' ? (
            <button
              type="button"
              onClick={restoreNormalMode}
              className="mr-3 px-3 py-1.5 rounded text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              通常モードに戻す
            </button>
          ) : (
            <button
              type="button"
              onClick={applyRelaxedMode}
              className="mr-3 px-3 py-1.5 rounded text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              条件緩和モード
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
      </div>

      {/* 検証レベル警告 */}
      {showVerificationWarning && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>電話番号認証が必要です。マッチング機能を完全に利用するには、プロフィール設定から認証レベルをアップグレードしてください。</span>
          </div>
        </div>
      )}

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
            className={`w-full p-3 border border-gray-300 rounded-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
            disabled={searchMode === 'relaxed'}
          >
            <option value={GenderPreference.ANY}>指定なし</option>
            <option value={GenderPreference.MALE}>男性</option>
            <option value={GenderPreference.FEMALE}>女性</option>
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
              className={`w-24 p-3 border border-gray-300 rounded-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
              disabled={searchMode === 'relaxed'}
            />
            <span>〜</span>
            <input
              type="number"
              name="age_range_max"
              min="18"
              max="99"
              value={localPreferences.age_range_max}
              onChange={handleInputChange}
              className={`w-24 p-3 border border-gray-300 rounded-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
              disabled={searchMode === 'relaxed'}
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
            className={`w-full p-3 border border-gray-300 rounded-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
            disabled={searchMode === 'relaxed'}
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
            className={`w-full p-3 border border-gray-300 rounded-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
            disabled={searchMode === 'relaxed'}
          >
            {ACTIVITY_LEVELS.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* 新規追加: 共通の趣味・関心数 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            共通の趣味・関心数
          </label>
          <select
            name="min_common_interests"
            value={localPreferences.min_common_interests ?? 0}
            onChange={handleInputChange}
            className={`w-full p-3 border border-gray-300 rounded-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
            disabled={searchMode === 'relaxed'}
          >
            {COMMON_INTERESTS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 新規追加: 検索半径 */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            検索半径
          </label>
          <select
            name="max_distance"
            value={localPreferences.max_distance ?? 0}
            onChange={handleInputChange}
            className={`w-full p-3 border border-gray-300 rounded-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
            disabled={searchMode === 'relaxed'}
          >
            {DISTANCE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">※地域の設定が必要です</p>
        </div>

        {/* 詳細フィルター設定 */}
        <div className="mb-6 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-gray-700 font-semibold">
              詳細フィルター
            </label>
            {!isPremium && (
              <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {FILTER_POINT_COST}ポイント/日 (残り: {balance ?? 0}ポイント)
              </span>
            )}
            {isPremium && (
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                プレミアム会員: 無料
              </span>
            )}
          </div>
          
          <div className={`space-y-3 bg-gray-50 p-4 rounded-lg ${searchMode === 'relaxed' ? 'opacity-70' : ''}`}>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="online_only"
                checked={localPreferences.online_only || false}
                onChange={handleCheckboxChange}
                className="mr-2"
                disabled={searchMode === 'relaxed'}
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
                disabled={searchMode === 'relaxed'}
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
                disabled={searchMode === 'relaxed'}
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
                disabled={searchMode === 'relaxed'}
              />
              <span>最近活動したユーザーのみ表示（1週間以内）</span>
            </label>
          </div>
        </div>

        {/* 表示ユーザーの追加設定 */}
        <div className="mb-6 border-t pt-4">
          <label className="block text-gray-700 font-semibold mb-2">
            表示ユーザーの設定
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="filter_skipped"
                checked={localPreferences.filter_skipped || false}
                onChange={handleCheckboxChange}
                className="mr-2"
                disabled={searchMode === 'relaxed'}
              />
              <span>以前スキップしたユーザーを表示しない</span>
            </label>
            
            {/* 新規追加: いいね済みユーザーの設定 */}
            <label className="flex items-center">
              <input
                type="checkbox"
                name="exclude_liked_users"
                checked={localPreferences.exclude_liked_users !== false}
                onChange={handleCheckboxChange}
                className="mr-2"
                disabled={searchMode === 'relaxed'}
              />
              <span>既にいいねしたユーザーを表示しない</span>
            </label>
          </div>
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
              className={`flex-1 p-3 border border-gray-300 rounded-l-lg ${searchMode === 'relaxed' ? 'bg-gray-100' : ''}`}
              placeholder="新しい興味を追加"
              disabled={searchMode === 'relaxed'}
            />
            <button
              type="button"
              onClick={handleAddInterest}
              className={`px-4 text-white rounded-r-lg ${
                searchMode === 'relaxed' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={searchMode === 'relaxed'}
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
                  disabled={searchMode === 'relaxed'}
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

        {/* ポイント消費の警告 */}
        {isFilterCostApplied && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span>詳細フィルターを使用すると、<strong>{FILTER_POINT_COST}ポイント</strong>消費します（プレミアム会員は無料）</span>
            </div>
          </div>
        )}

       {/* 設定リセット警告 */}
       {searchMode === 'relaxed' && (
          <div className="mb-6 p-3 bg-green-50 border border-green-300 rounded-lg text-green-800">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>条件緩和モードが適用されています。より多くのマッチング候補が表示されます。詳細フィルターは使用されません。
              <strong>いいね済みユーザーも表示されます。</strong></span>
            </div>
          </div>
        )}

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 mr-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
            disabled={saving || processingAction}>
            キャンセル
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-white rounded-lg ${
              showVerificationWarning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400'
            }`}
            disabled={saving || processingAction || showVerificationWarning}
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchPreferences;