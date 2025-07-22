import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast, Toaster } from 'react-hot-toast';
import useMatching from '@/services/matching/useMatching';
import usePoints from '@/hooks/usePoints';

import {
  MatchingPreferences,
  ActivityLevel,
  GenderPreference,
} from '@/types/matching';

interface MatchPreferencesProps {
  onClose: () => void;
  verificationLevel?: number;
}

/* -------------------- 定数 -------------------- */
const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県',
  '埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県',
  '佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

const ACTIVITY_LEVELS = [
  { value: ActivityLevel.VERY_ACTIVE, label: '非常に活発' },
  { value: ActivityLevel.ACTIVE,      label: '活発' },
  { value: ActivityLevel.MODERATE,    label: '普通' },
  { value: ActivityLevel.CASUAL,      label: 'カジュアル' },
];

const DISTANCE_OPTIONS = [
  { value: 0,   label: '指定なし' },
  { value: 10,  label: '10km以内' },
  { value: 30,  label: '30km以内' },
  { value: 50,  label: '50km以内' },
  { value: 100, label: '100km以内' },
];

const COMMON_INTERESTS_OPTIONS = [
  { value: 0, label: '指定なし' },
  { value: 1, label: '1つ以上' },
  { value: 2, label: '2つ以上' },
  { value: 3, label: '3つ以上' },
  { value: 5, label: '5つ以上' },
];

const FILTER_POINT_COST = 3;

/* -------------------- コンポーネント -------------------- */
const MatchPreferences: React.FC<MatchPreferencesProps> = ({
  onClose,
  verificationLevel = 2,
}) => {
  /* hooks */
  const {
    loadingPreferences,
    processingAction,
    preferences,
    fetchPreferences,
    savePreferences,
  } = useMatching();

  const {
    balance,
    loading: pointsLoading,
    consumePoints,
    hasEnoughPoints,
    isPremium,
  } = usePoints();

  /* local state */
  const [localPreferences, setLocalPreferences] = useState<MatchingPreferences>({
    genderPreference: GenderPreference.ANY,
    ageRange: [18, 99],
    location: {},
    interests: [],
    genrePreference: [],
    activityLevel: ActivityLevel.MODERATE,
    onlineOnly: false,
    premiumOnly: false,
    hasVideoHistory: false,
    recentActivity: false,
    filterSkipped: false,
    excludeLikedUsers: true,
    minCommonInterests: 0,
    maxDistance: 0,
    relaxedMode: false,
  });

  const [newInterest, setNewInterest] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [isFilterCostApplied, setIsFilterCostApplied] = useState(false);
  const [searchMode, setSearchMode] = useState<'normal' | 'relaxed'>('normal');
  const [lastUsedFilter, setLastUsedFilter] =
    useState<MatchingPreferences | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /* ---------- 初期ロード ---------- */
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      const merged: MatchingPreferences = {
        ...preferences,
        minCommonInterests: preferences.minCommonInterests ?? 0,
        maxDistance: preferences.maxDistance ?? 0,
        filterSkipped: preferences.filterSkipped ?? false,
        excludeLikedUsers: preferences.excludeLikedUsers !== false,
        ageRange: preferences.ageRange ?? [18, 99],
        relaxedMode: false,
      };
      setLocalPreferences(merged);
      setLastUsedFilter(merged);
      setHasUnsavedChanges(false);
    }
  }, [preferences]);

  /* ---------- 詳細フィルターのポイントコスト判定 ---------- */
  useEffect(() => {
    const detailed =
      localPreferences.onlineOnly ||
      localPreferences.premiumOnly ||
      localPreferences.hasVideoHistory ||
      localPreferences.recentActivity ||
      (localPreferences.minCommonInterests ?? 0) > 0 ||
      (localPreferences.maxDistance ?? 0) > 0;

    setIsFilterCostApplied(detailed && !isPremium && searchMode !== 'relaxed');
  }, [localPreferences, isPremium, searchMode]);

  /* ---------- ユーティリティ ---------- */
  const markAsChanged = (): void => {
    setHasUnsavedChanges(true);
    if (searchMode === 'relaxed') setSearchMode('normal');
  };

  const updateAgeRange = (index: 0 | 1, value: number): void => {
    setLocalPreferences((prev) => {
      const newRange: [number, number] = [...prev.ageRange] as [number, number];
      newRange[index] = value;
      return { ...prev, ageRange: newRange };
    });
  };

  /* ---------- ハンドラ ---------- */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = e.target;

    switch (name) {
      case 'ageRangeMin':
        updateAgeRange(0, Number(value));
        break;
      case 'ageRangeMax':
        updateAgeRange(1, Number(value));
        break;
      case 'genderPreference':
        setLocalPreferences((p) => ({
          ...p,
          genderPreference: value as GenderPreference,
        }));
        break;
      case 'activityLevel':
        setLocalPreferences((p) => ({
          ...p,
          activityLevel: value as ActivityLevel,
        }));
        break;
      case 'minCommonInterests':
      case 'maxDistance':
        setLocalPreferences((p) => ({ ...p, [name]: Number(value) }));
        break;
      default:
        setLocalPreferences((p) => ({ ...p, [name]: value }));
    }
    markAsChanged();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, checked } = e.target;
    setLocalPreferences((p) => ({ ...p, [name]: checked }));
    markAsChanged();
  };

  const handleLocationChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    const { value } = e.target;
    setLocalPreferences((p) => ({
      ...p,
      location: { ...(p.location ?? {}), prefecture: value },
    }));
    markAsChanged();
  };

  /* ---------- interests ---------- */
  const handleAddInterest = (): void => {
    const trimmed = newInterest.trim();
    if (trimmed && !localPreferences.interests.includes(trimmed)) {
      setLocalPreferences((p) => ({
        ...p,
        interests: [...p.interests, trimmed],
      }));
      setNewInterest('');
      markAsChanged();
    }
  };

  const handleRemoveInterest = (interest: string): void => {
    setLocalPreferences((p) => ({
      ...p,
      interests: p.interests.filter((i) => i !== interest),
    }));
    markAsChanged();
  };

  /* ---------- 緩和モード ---------- */
  const applyRelaxedMode = (): void => {
    if (searchMode !== 'relaxed') setLastUsedFilter({ ...localPreferences });

    setSearchMode('relaxed');
    setLocalPreferences({
      genderPreference: GenderPreference.ANY,
      ageRange: [18, 99],
      location: {},
      interests: [],
      genrePreference: [],
      activityLevel: ActivityLevel.MODERATE,
      onlineOnly: false,
      premiumOnly: false,
      hasVideoHistory: false,
      recentActivity: false,
      filterSkipped: false,
      excludeLikedUsers: false,
      minCommonInterests: 0,
      maxDistance: 0,
      relaxedMode: true,
    });
    toast.success('緩和モードを適用しました');
    setHasUnsavedChanges(true);
  };

  const restoreNormalMode = (): void => {
    if (lastUsedFilter) setLocalPreferences({ ...lastUsedFilter, relaxedMode: false });
    setSearchMode('normal');
    toast.success('通常モードに戻しました');
    setHasUnsavedChanges(true);
  };

  /* ---------- 保存 ---------- */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);

    try {
      const [minAge, maxAge] = localPreferences.ageRange;
      if (minAge > maxAge) {
        toast.error('最小年齢は最大年齢より小さくしてください');
        setSaving(false);
        return;
      }

      if (verificationLevel < 2) {
        toast.error('電話番号認証が必要です。');
        setSaving(false);
        return;
      }

      if (isFilterCostApplied && !hasEnoughPoints(FILTER_POINT_COST)) {
        toast.error(`詳細フィルターには ${FILTER_POINT_COST} ポイント必要です`);
        setSaving(false);
        return;
      }

      if (isFilterCostApplied) {
        const ok = await consumePoints(
          FILTER_POINT_COST,
          'filter_usage',
          undefined,
          '詳細マッチングフィルター使用',
        );
        if (!ok) {
          toast.error('ポイント消費に失敗しました');
          setSaving(false);
          return;
        }
      }

      const success = await savePreferences(localPreferences);
      if (success) {
        toast.success(
          isFilterCostApplied
            ? `設定を保存しました（-${FILTER_POINT_COST} pt）`
            : '設定を保存しました',
        );
        setHasUnsavedChanges(false);
        onClose();
      } else {
        toast.error('保存に失敗しました');
      }
    } catch (err) {
      console.error(err);
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    if (!hasUnsavedChanges || confirm('変更を破棄しますか？')) onClose();
  };

  /* ---------- レンダリング ---------- */
  if (loadingPreferences || pointsLoading) return <LoadingSpinner />;

  const showVerificationWarning = verificationLevel < 2;
  const [minAge, maxAge] = localPreferences.ageRange;

  /* ---------- UI ---------- */
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
      <Toaster position="top-right" />

      {/* ヘッダー */}
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
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* 警告 */}
      {showVerificationWarning && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800">
          電話番号認証が必要です。プロフィール設定から認証を完了してください。
        </div>
      )}

      {/* フォーム */}
      <form onSubmit={handleSubmit}>
        {/* 性別 */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">相手の性別</label>
          <select
            name="genderPreference"
            value={localPreferences.genderPreference}
            onChange={handleInputChange}
            className="w-full p-3 border rounded-lg"
            disabled={searchMode === 'relaxed'}
          >
            <option value={GenderPreference.ANY}>指定なし</option>
            <option value={GenderPreference.MALE}>男性</option>
            <option value={GenderPreference.FEMALE}>女性</option>
          </select>
        </div>

        {/* 年齢 */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">年齢範囲</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              name="ageRangeMin"
              min={18}
              max={99}
              value={minAge}
              onChange={handleInputChange}
              className="w-24 p-3 border rounded-lg"
              disabled={searchMode === 'relaxed'}
            />
            <span>〜</span>
            <input
              type="number"
              name="ageRangeMax"
              min={18}
              max={99}
              value={maxAge}
              onChange={handleInputChange}
              className="w-24 p-3 border rounded-lg"
              disabled={searchMode === 'relaxed'}
            />
            <span>歳</span>
          </div>
        </div>

        {/* 地域 */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">地域</label>
          <select
            value={localPreferences.location?.prefecture ?? ''}
            onChange={handleLocationChange}
            className="w-full p-3 border rounded-lg"
            disabled={searchMode === 'relaxed'}
          >
            <option value="">指定なし</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* 活動レベル */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">活動レベル</label>
          <select
            name="activityLevel"
            value={localPreferences.activityLevel}
            onChange={handleInputChange}
            className="w-full p-3 border rounded-lg"
            disabled={searchMode === 'relaxed'}
          >
            {ACTIVITY_LEVELS.map((lvl) => (
              <option key={lvl.value} value={lvl.value}>
                {lvl.label}
              </option>
            ))}
          </select>
        </div>

        {/* 共通趣味数 */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">
            共通の趣味・関心数
          </label>
          <select
            name="minCommonInterests"
            value={localPreferences.minCommonInterests}
            onChange={handleInputChange}
            className="w-full p-3 border rounded-lg"
            disabled={searchMode === 'relaxed'}
          >
            {COMMON_INTERESTS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* 検索半径 */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">検索半径</label>
          <select
            name="maxDistance"
            value={localPreferences.maxDistance}
            onChange={handleInputChange}
            className="w-full p-3 border rounded-lg"
            disabled={searchMode === 'relaxed'}
          >
            {DISTANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* 詳細フィルター */}
        <div className="mb-6 border-t pt-4">
          <div className="flex justify-between mb-2">
            <label className="font-semibold">詳細フィルター</label>
            {!isPremium ? (
              <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {FILTER_POINT_COST}pt / 日 (残 {balance})
              </span>
            ) : (
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                プレミアム: 無料
              </span>
            )}
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            {[
              { key: 'onlineOnly',       label: 'オンラインのみ' },
              { key: 'premiumOnly',      label: 'プレミアムのみ' },
              { key: 'hasVideoHistory',  label: '視聴履歴あり' },
              { key: 'recentActivity',   label: '最近活動 (1週間)' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  name={key}
                  checked={(localPreferences as any)[key] ?? false}
                  onChange={handleCheckboxChange}
                  className="mr-2"
                  disabled={searchMode === 'relaxed'}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* 表示ユーザー設定 */}
        <div className="mb-6 border-t pt-4">
          <label className="block font-semibold mb-2">表示ユーザー設定</label>
          <div className="space-y-3">
            {[
              { key: 'filterSkipped',     label: '以前スキップしたユーザーを除外' },
              { key: 'excludeLikedUsers', label: 'いいね済みユーザーを除外' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  name={key}
                  checked={(localPreferences as any)[key] ?? false}
                  onChange={handleCheckboxChange}
                  className="mr-2"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* 興味関心 */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">興味・関心</label>
          <div className="flex mb-2">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              className="flex-1 p-3 border rounded-l-lg"
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
          <div className="flex flex-wrap gap-2">
            {localPreferences.interests.length > 0 ? (
              localPreferences.interests.map((interest) => (
                <div
                  key={interest}
                  className="flex items-center bg-blue-100 px-3 py-1 rounded-full"
                >
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
              ))
            ) : (
              <span className="text-gray-500">
                興味・関心を追加してください
              </span>
            )}
          </div>
        </div>

        {/* 緩和モード・ポイント消費表示 */}
        {searchMode === 'relaxed' && (
          <div className="mb-6 p-3 bg-green-50 border border-green-300 rounded-lg text-green-800">
            条件緩和モード中です。詳細フィルターは無効で、いいね済みユーザーも表示されます。
          </div>
        )}

        {isFilterCostApplied && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800">
            詳細フィルター使用で <strong>{FILTER_POINT_COST} pt</strong> 消費します。
          </div>
        )}

        {/* ボタン */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 mr-2 border rounded-lg"
            disabled={saving || processingAction}
          >
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
            {saving ? '保存中…' : '設定を保存'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchPreferences;
