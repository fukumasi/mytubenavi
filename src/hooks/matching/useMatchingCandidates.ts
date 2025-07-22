// src/hooks/matching/useMatchingCandidates.ts

import { useState, useCallback, useRef } from 'react';
import { fetchMatchCandidates } from '@/services/matching/matchCandidatesService';
import { MatchingUser } from '@/types/matching';
import { toast } from 'react-hot-toast';

/**
 * マッチング候補取得ロジックをカスタムフックとして提供
 */
export function useMatchingCandidates({
  userId,
  fetchPreferences,
  initializeDefaultPreferences,
  isRelaxedMode,
  toggleRelaxedMode,
  matchedOnly = false,
}: {
  userId: string;
  fetchPreferences: () => Promise<any>;
  initializeDefaultPreferences: () => Promise<boolean>;
  isRelaxedMode: boolean;
  toggleRelaxedMode: (enableRelaxed: boolean) => void;
  matchedOnly?: boolean;
}) {
  const [candidates, setCandidates] = useState<MatchingUser[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const isFetchingRef = useRef(false);

  const loadCandidates = useCallback(async (useRelaxed = false) => {
    if (isFetchingRef.current || !userId) return;

    try {
      setLoadingCandidates(true);
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

      const fetchedCandidates = await fetchMatchCandidates(userId, preferences, matchedOnly);
      setCandidates(fetchedCandidates);

    } catch (error) {
      console.error('マッチング候補取得エラー:', error);
      toast.error('候補取得に失敗しました');
    } finally {
      setLoadingCandidates(false);
      isFetchingRef.current = false;
    }
  }, [userId, initializeDefaultPreferences, fetchPreferences, isRelaxedMode, toggleRelaxedMode, matchedOnly]);

  return {
    candidates,
    loadingCandidates,
    loadCandidates,
  };
}
