import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserCard from '@/components/matching/UserCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';

import type { EnhancedMatchingUser } from '@/types/matching';
import { GenderPreference } from '@/types/matching';     // ★ 追加
import type { MatchingPreferences } from '@/types/preferences';
import {
  fetchEnhancedMatchCandidates,
  sendLike,
  skipUser,
} from '@/services/matchingService';

interface MatchingSystemProps {
  limit?: number;
  matchedOnly?: boolean;
}

export default function MatchingSystem({
  limit = 20,
  matchedOnly = false,
}: MatchingSystemProps) {
  const { user, isPremium, loading: loadingUser } = useAuth();

  const [candidates, setCandidates] = useState<EnhancedMatchingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [useViewingData, setUseViewingData] = useState(true);

  /* -------------------------------------------------- */
  /*                   データ取得                       */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (user && !loadingUser) loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser, useViewingData, matchedOnly]);

  const loadCandidates = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // TODO: 実際には保存済み設定を取得
      const dummyPreferences: MatchingPreferences = {
        genderPreference: GenderPreference.ANY,
        ageRange: [18, 99],
        interests: [],
        genrePreference: [],
        relaxedMode: false,
        location: {},
        activityLevel: undefined,
        maxDistance: undefined,
        minCommonInterests: undefined,
        onlineOnly: undefined,
        premiumOnly: undefined,
        hasVideoHistory: undefined,
        recentActivity: undefined,
        filterSkipped: undefined,
        excludeLikedUsers: undefined
      };

      const list = await fetchEnhancedMatchCandidates(
        user.id,
        dummyPreferences,
        useViewingData,
      );

      setCandidates(
        (matchedOnly ? list.filter((c) => c.is_matched) : list).slice(0, limit),
      );
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
      toast.error('マッチング候補の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------- */
  /*                   Like / Skip                      */
  /* -------------------------------------------------- */
  const handleLike = async (targetId: string): Promise<boolean> => {
    if (!user) return false;
    const res = await sendLike(user.id, targetId, isPremium);
    if (!res.success) {
      toast.error(res.error ?? 'いいね送信失敗');
      return false;
    }
    toast.success(res.isMatch ? '🎉 マッチしました！' : 'いいね！');
    setCurrentIndex((i) => i + 1);
    return true;
  };

  const handleSkip = async (targetId: string): Promise<boolean> => {
    if (!user) return false;
    const ok = await skipUser(user.id, targetId);
    if (!ok) {
      toast.error('スキップに失敗しました');
      return false;
    }
    setCurrentIndex((i) => i + 1);
    return true;
  };

  /* -------------------------------------------------- */
  /*                      UI                            */
  /* -------------------------------------------------- */
  if (loadingUser || loading) return <LoadingSpinner />;

  if (currentIndex >= candidates.length)
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold mb-2">候補がありません</h3>
        <button
          onClick={loadCandidates}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          更新
        </button>
      </div>
    );

  const current = candidates[currentIndex];

  return (
    <div className="max-w-md mx-auto p-4">
      {/* トグル & インジケータ */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          視聴傾向
          <button
            onClick={() => setUseViewingData((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useViewingData ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useViewingData ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {currentIndex + 1}/{candidates.length}
        </span>
      </div>

      {/* 候補表示 */}
      <UserCard
        user={current}
        onLike={handleLike}
        onSkip={handleSkip}
        hasDetailedView
        isPremium={isPremium}
        showYouTubeLink={false}
        isPhoneVerified={current.phone_verified ?? false}
      />
    </div>
  );
}
