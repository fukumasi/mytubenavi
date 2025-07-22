import { useState, useCallback } from 'react';
import {
  getMatchingProfile,
  getCommonVideos,       // matchingService で export されている
} from '@/services/matchingService';
import { toast } from 'react-hot-toast';

import type {
  MatchingProfileDetails,
  VideoDetails,
  CommonVideo,
} from '@/types/matching';

/**
 * プロフィール・詳細情報取得専用フック
 */
export function useMatchingProfile(currentUserId: string) {
  /** 詳細プロフィール（共通動画など込み） */
  const [detailedProfile, setDetailedProfile] =
    useState<MatchingProfileDetails | null>(null);

  /** 共通動画 */
  const [commonVideos, setCommonVideos] = useState<CommonVideo[]>([]);

  /** 視聴トレンド（キーワード → count） */
  const [viewingTrends, setViewingTrends] = useState<Record<string, number>>({});

  /** 共通フレンド（将来用 — ここでは空配列で初期化） */
  const [commonFriends, setCommonFriends] = useState<any[]>([]);

  /** loading フラグ */
  const [loadingProfile, setLoadingProfile] = useState(false);

  /**
   * 対象ユーザーの詳細プロフィール取得
   */
  const fetchDetailedProfile = useCallback(
    async (targetUserId: string) => {
      if (!currentUserId || !targetUserId) return null;

      try {
        setLoadingProfile(true);

        /* 1️⃣ 基本プロフィール（Supabase RPC） */
        const profileData = await getMatchingProfile(currentUserId, targetUserId);

        if (!profileData) throw new Error('プロフィール取得失敗');

        /* 2️⃣ 共通動画（CommonVideo[]） */
        const commons = await getCommonVideos(currentUserId, targetUserId, 20);

        /* 3️⃣ 視聴トレンド（今回は空オブジェクトで返す） */
        const trends: Record<string, number> = {}; // ← 取得ロジック未実装

        /* 4️⃣ 共通フレンド（今回は空配列で返す） */
        const friends: any[] = []; // ← 取得ロジック未実装

        /* 5️⃣ フルオブジェクトを整形 */
        const fullProfile: MatchingProfileDetails = {
          ...profileData,
          /* MatchingProfileDetails.commonVideos は VideoDetails[] 型だが、
             ここでは CommonVideo[] をそのまま押し込み、型を強制変換しておく。*/
          commonVideos: commons as unknown as VideoDetails[],
        };

        /* state 反映 */
        setDetailedProfile(fullProfile);
        setCommonVideos(commons);
        setViewingTrends(trends);
        setCommonFriends(friends);

        return fullProfile;
      } catch (err) {
        console.error('詳細プロフィール取得エラー:', err);
        toast.error('プロフィール情報の取得に失敗しました');
        return null;
      } finally {
        setLoadingProfile(false);
      }
    },
    [currentUserId],
  );

  /* フック戻り値 */
  return {
    detailedProfile,
    commonVideos,          // CommonVideo[]
    viewingTrends,         // Record<string, number>
    commonFriends,         // any[]
    loadingProfile,
    fetchDetailedProfile,
  };
}
