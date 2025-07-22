// src/components/profile/MatchingCandidates.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import useMatching from '@/services/matching/useMatching';
import { fetchMatchCandidates, fetchSuggestedCandidatesByInterests } from '@/services/matching/matchCandidatesService';
import { sendLike } from '@/services/matching/likeService';
import { skipUser as skipUserAction } from '@/services/matching/skipService';
import { getProfile } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import UserCard from '@/components/matching/UserCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MatchingUser } from '@/types/matching';

interface MatchingCandidatesProps {
  limit?: number;
}

const ageGroups = [
  { label: '10代（18・19歳）', start: 18 },
  { label: '20代', start: 20 },
  { label: '30代', start: 30 },
  { label: '40代', start: 40 },
  { label: '50代', start: 50 },
  { label: '60代', start: 60 },
  { label: '70代', start: 70 },
  { label: '80代', start: 80 },
  { label: '90代', start: 90 },
];

function calculateAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export default function MatchingCandidates({ limit }: MatchingCandidatesProps) {
  const { user, isPremium, loading: loadingUser } = useAuth();
  const {
    initializeDefaultPreferences,
    fetchPreferences,
    isRelaxedMode,
    toggleRelaxedMode,
  } = useMatching();

  const [candidates, setCandidates] = useState<MatchingUser[]>([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const loadMatches = useCallback(async (useRelaxed = false) => {
    if (isFetchingRef.current || !user) return;

    try {
      setLoading(true);
      isFetchingRef.current = true;

      await initializeDefaultPreferences();
      if (useRelaxed !== isRelaxedMode) {
        toggleRelaxedMode(useRelaxed);
      }

      const preferences = await fetchPreferences();
      if (!preferences) {
        toast.error('マッチング設定の取得に失敗しました');
        return;
      }

      const fetchedCandidates = await fetchMatchCandidates(user.id, preferences, false);

      if (fetchedCandidates.length === 0) {
        const userProfile = await getProfile();
        const interests = userProfile?.interests || [];
        if (interests.length > 0) {
          const fallbackCandidates = await fetchSuggestedCandidatesByInterests(user.id, interests);
          if (fallbackCandidates.length > 0) {
            toast('興味ジャンルに基づく候補を表示しています');
            setCandidates(fallbackCandidates);
          }
        }
      } else {
        setCandidates(fetchedCandidates);
      }
    } catch (error) {
      console.error('マッチングデータ取得エラー:', error);
      toast.error('データ取得に失敗しました');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, initializeDefaultPreferences, fetchPreferences, isRelaxedMode, toggleRelaxedMode]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleAgeGroupChange = (label: string) => {
    setSelectedAgeGroups(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleClearAgeGroups = () => {
    setSelectedAgeGroups([]);
  };

  const handleLike = async (targetUserId: string): Promise<boolean> => {
    if (!user || isPremium === undefined) return false;
    try {
      const result = await sendLike(user.id, targetUserId, isPremium);
      if (result.success) {
        toast.success('いいね！しました');
        setCandidates(prev => prev.filter(u => u.id !== targetUserId));
      } else {
        toast.error(result.error || 'いいねに失敗しました');
      }
      return result.success;
    } catch (error) {
      console.error('いいねエラー:', error);
      toast.error('いいねに失敗しました');
      return false;
    }
  };

  const handleSkip = async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      await skipUserAction(user.id, targetUserId);
      toast.success('スキップしました');
      setCandidates(prev => prev.filter(u => u.id !== targetUserId));
      return true;
    } catch (error) {
      console.error('スキップエラー:', error);
      toast.error('スキップに失敗しました');
      return false;
    }
  };

  const handleViewProfile = async (targetUserId: string): Promise<void> => {
    console.log(`詳細プロフィールを表示: ${targetUserId}`);
  };

  if (loadingUser || loading) {
    return <div className="flex justify-center py-10"><LoadingSpinner /></div>;
  }

  const filteredCandidates = candidates.filter(candidate => {
    if (!candidate || !candidate.birth_date) return false;
    const age = calculateAge(candidate.birth_date);
    if (age === null || age < 18) return false;

    if (selectedAgeGroups.length === 0) return true;

    return selectedAgeGroups.some(label => {
      const group = ageGroups.find(g => g.label === label);
      if (!group) return false;
      const start = group.start;
      const end = (start === 18) ? 20 : start + 10;
      return age >= start && age < end;
    });
  });

  const sortedCandidates = [...filteredCandidates]
    .sort((a, b) => (b.matching_score || 0) - (a.matching_score || 0))
    .slice(0, limit);

  if (sortedCandidates.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-700">マッチング候補が見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* 年代フィルター */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">年代で絞り込む</h3>
        <div className="flex flex-wrap gap-4">
          {ageGroups.map(group => (
            <label key={group.label} className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selectedAgeGroups.includes(group.label)}
                onChange={() => handleAgeGroupChange(group.label)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>{group.label}</span>
            </label>
          ))}
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={selectedAgeGroups.length === 0}
              onChange={handleClearAgeGroups}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>年齢指定なし（18歳以上）</span>
          </label>
        </div>
      </div>

      {/* マッチング候補リスト */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCandidates.map(candidate => (
          <UserCard
            key={candidate.id}
            user={candidate}
            onLike={handleLike}
            onSkip={handleSkip}
            onViewProfile={handleViewProfile}
            isPremium={isPremium}
            hasDetailedView={true}
            showYouTubeLink={true}
            userGender={candidate.gender}
            isPhoneVerified={candidate.phone_verified ?? false}
          />
        ))}
      </div>
    </div>
  );
}
