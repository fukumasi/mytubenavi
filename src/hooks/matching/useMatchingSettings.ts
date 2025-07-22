import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getMatchingPreferences,
  saveMatchingPreferences as saveMatchingPreferencesService,
} from '@/services/matchingService';
import { MatchingPreferences } from '@/types/preferences';
import { GenderPreference } from '@/types/matching';
import { toast } from 'react-hot-toast';

/**
 * マッチング設定・緩和モード管理フック
 */
export function useMatchingSettings(userId: string) {
  const [preferences, setPreferences] = useState<MatchingPreferences | null>(null);
  const [isRelaxedMode, setIsRelaxedMode] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  /* ---------- 設定取得 ---------- */
  const fetchPreferences = useCallback(async () => {
    if (!userId) return null;
    setLoadingPreferences(true);
    try {
      const prefs = await getMatchingPreferences(userId);
      setPreferences(prefs);
      return prefs;
    } catch (error) {
      console.error('設定取得エラー:', error);
      toast.error('マッチング設定の取得に失敗しました');
      return null;
    } finally {
      setLoadingPreferences(false);
    }
  }, [userId]);

  /* ---------- 設定保存 ---------- */
  const savePreferences = useCallback(
    async (newPreferences: MatchingPreferences) => {
      if (!userId) return false;
      try {
        const ok = await saveMatchingPreferencesService(userId, newPreferences);
        if (ok) setPreferences(newPreferences);
        return ok;
      } catch (error) {
        console.error('設定保存エラー:', error);
        toast.error('マッチング設定の保存に失敗しました');
        return false;
      }
    },
    [userId],
  );

  /* ---------- Relaxed Mode toggle ---------- */
  const toggleRelaxedMode = useCallback((enable: boolean) => {
    setIsRelaxedMode(enable);
  }, []);

  /* ---------- デフォルト初期化 ---------- */
  const initializeDefaultPreferences = useCallback(async () => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('user_matching_preferences')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        /* まだ設定が無い ⇒ デフォルト作成 */
        const defaultPrefs: MatchingPreferences = {
          genderPreference: GenderPreference.ANY,
          ageRange: [18, 99],
          location: { prefecture: '' },
          interests: [],
          genrePreference: [],
          maxDistance: 50,
          minCommonInterests: 0,
          filterSkipped: false,
          excludeLikedUsers: true,
        };
        await saveMatchingPreferencesService(userId, defaultPrefs);
        setPreferences(defaultPrefs);
      }
      return true;
    } catch (err) {
      console.error('デフォルト設定初期化エラー:', err);
      toast.error('デフォルト設定の初期化に失敗しました');
      return false;
    }
  }, [userId]);

  return {
    preferences,
    isRelaxedMode,
    loadingPreferences,
    fetchPreferences,
    savePreferences,
    toggleRelaxedMode,
    initializeDefaultPreferences,
  };
}
