// src/services/matching/matchCandidatesService.ts

import { supabase } from '@/lib/supabase';
import { MatchingUser } from '@/types/matching';
import { MatchingPreferences } from '@/types/preferences';

/**
 * マッチ候補を取得する Supabase RPC 呼び出し
 * preferences_input には CamelCase のキーを持つ完全な JSON を渡す必要がある
 */
export async function fetchMatchCandidates(
  userId: string,
  preferences: MatchingPreferences,
  matchedOnly: boolean
): Promise<MatchingUser[]> {
  const filteredPreferences = {
    genderPreference: preferences.genderPreference ?? 'any',
    ageRange: preferences.ageRange ?? [18, 99],
    location: preferences.location ?? '',
    interests: preferences.interests ?? [],
    relaxedMode: preferences.relaxedMode ?? false,
  };

  const { data, error } = await supabase.rpc('fetch_match_candidates', {
    user_id_input: userId,
    preferences_input: filteredPreferences,
    matched_only_input: matchedOnly,
  });

  if (error) {
    console.error('マッチ候補取得エラー:', error.message);
    return [];
  }

  return data as MatchingUser[];
}

/**
 * ジャンルベースのマッチ候補を取得（フォールバック用）
 */
export async function fetchSuggestedCandidatesByInterests(
  userId: string,
  interests: string[]
): Promise<MatchingUser[]> {
  const { data, error } = await supabase.rpc('match_by_interests', {
    uid: userId,
    tags: interests,
  });

  if (error) {
    console.error('ジャンル候補取得エラー:', error.message);
    return [];
  }

  return data as MatchingUser[];
}
