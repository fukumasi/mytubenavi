// src/components/matching/UserCard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  X,
  Eye,
  PlayCircle,
  BarChart3,
} from 'lucide-react';
import { EnhancedMatchingUser } from '@/types/matching';

export interface UserCardProps {
  user: EnhancedMatchingUser;
  onLike: (userId: string) => Promise<boolean>;
  onSkip: (userId: string) => Promise<boolean>;
  /* -- 以下は optional (呼び出し側との互換保持) -- */
  isPremium?: boolean;            // カード所持者ではなく *閲覧ユーザー* のプレミアム可否
  hasDetailedView?: boolean;
  showYouTubeLink?: boolean;
  userGender?: string;            // ← まだ未使用だが型互換のため残す
  isPhoneVerified?: boolean;
  onViewProfile?: (userId: string) => void;
}

export default function UserCard({
  user,
  onLike,
  onSkip,
  isPremium = false,
  hasDetailedView = true,
  showYouTubeLink = false,
  userGender: _userGender,        // eslint-disable-line @typescript-eslint/no-unused-vars
  isPhoneVerified = false,
  onViewProfile,
}: UserCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /* ---------- 共通 util ---------- */
  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getMatchReasons = () => {
    const reasons: string[] = [];
    if (user.common_videos_count && user.common_videos_count > 0) {
      reasons.push(`${user.common_videos_count}本の共通視聴動画`);
    }
    if (user.content_similarity && user.content_similarity > 0.7) {
      reasons.push('類似したジャンル好み');
    }
    if (user.rating_correlation && user.rating_correlation > 0.6) {
      reasons.push('似た評価傾向');
    }
    return reasons.slice(0, 2);
  };

  /* ---------- like / skip ---------- */
  const handleLike = async () => {
    setIsProcessing(true);
    await onLike(user.id);
    setIsProcessing(false);
  };

  const handleSkip = async () => {
    setIsProcessing(true);
    await onSkip(user.id);
    setIsProcessing(false);
  };

  /* ---------- JSX ---------- */
  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg overflow-hidden"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      onClick={() => onViewProfile?.(user.id)}
    >
      {/* ------------- 表面 ------------- */}
      <div
        className={`transition-opacity duration-500 ${
          isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* サムネイル */}
        <div className="relative h-64 bg-gradient-to-br from-blue-400 to-purple-600">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-gray-600">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* スコア */}
          <span
            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold ${getSimilarityColor(
              user.matching_score,
            )}`}
          >
            {Math.round(user.matching_score * 100)}%
          </span>

          {/* プレミアムバッジ */}
          {(user.is_premium || isPremium) && (
            <span className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
              ⭐ PREMIUM
            </span>
          )}

          {/* 電話認証バッジ */}
          {isPhoneVerified && (
            <span className="absolute bottom-4 left-4 bg-green-500 text-white px-2 py-0.5 rounded text-xs">
              ✅ Verified
            </span>
          )}
        </div>

        {/* 基本情報 */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold">{user.username}</h3>
            {user.age && <span className="text-sm text-gray-600">{user.age}歳</span>}
          </div>

          {user.bio && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{user.bio}</p>
          )}

          {/* マッチ要約 */}
          <div className="space-y-3 mb-4">
            {user.common_videos_count! > 0 && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <PlayCircle size={16} />
                <span>{user.common_videos_count}本の共通視聴動画</span>
              </div>
            )}

            {user.match_details?.similarity_breakdown && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['content', 'rating', 'timing', 'genre'] as const).map((k) => (
                  <div key={k} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>
                      {{
                        content: 'コンテンツ',
                        rating: '評価',
                        timing: '時間帯',
                        genre: 'ジャンル',
                      }[k]}
                      :{' '}
                      {Math.round(
                        (user.match_details!.similarity_breakdown as any)[k] * 100,
                      )}
                      %
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {getMatchReasons().map((r) => (
                <span
                  key={r}
                  className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* アクション */}
          <div className="flex gap-3">
            <motion.button
              className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              disabled={isProcessing}
            >
              <X size={20} className="inline mr-1" />
              パス
            </motion.button>
            <motion.button
              className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white py-3 rounded-xl disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              disabled={isProcessing}
            >
              <Heart size={20} className="inline mr-1" />
              いいね
            </motion.button>
          </div>

          {/* 詳細リンク */}
          {hasDetailedView && (
            <button
              className="w-full mt-3 text-blue-600 text-sm py-2 hover:bg-blue-50 rounded-lg"
              onClick={() => setIsFlipped(true)}
            >
              <Eye size={16} className="inline mr-1" />
              詳細を見る
            </button>
          )}

          {/* 任意: YouTube リンク */}
          {showYouTubeLink && user.channel_url && (
            <a
              href={user.channel_url}
              target="_blank"
              rel="noreferrer"
              className="block text-center mt-2 text-sm text-red-600 hover:underline"
            >
              📺 YouTube チャンネル
            </a>
          )}
        </div>
      </div>

      {/* ------------- 裏面（詳細） ------------- */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-6 h-full overflow-y-auto bg-white">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold">{user.username} さんの詳細</h3>
            <button onClick={() => setIsFlipped(false)}>
              <X size={20} />
            </button>
          </div>

          {/* 共通動画 */}
          {user.match_details?.common_videos?.length ? (
            <div className="mb-6">
              <h4 className="flex items-center gap-1 mb-3 text-sm font-semibold">
                <PlayCircle size={16} /> 共通視聴動画
              </h4>
              <div className="space-y-2">
                {user.match_details.common_videos.slice(0, 5).map((v) => (
                  <div
                    key={v.video_id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">
                      📺
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {v.video_title || 'タイトル不明'}
                      </p>
                      {(v.user1_rating || v.user2_rating) && (
                        <p className="text-xs text-gray-500">
                          あなた: ⭐{v.user1_rating ?? '-'} / 相手: ⭐{v.user2_rating ?? '-'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 視聴統計 */}
          {user.viewing_stats && (
            <div className="mb-6">
              <h4 className="flex items-center gap-1 mb-3 text-sm font-semibold">
                <BarChart3 size={16} /> 視聴統計
              </h4>
              <div className="grid grid-cols-2 gap-3 text-center">
                <StatBox label="視聴動画数" value={user.viewing_stats.total_videos} color="blue" />
                <StatBox
                  label="平均評価"
                  value={Math.round(user.viewing_stats.avg_rating * 10) / 10}
                  color="green"
                />
                <StatBox
                  label="完了率"
                  value={`${Math.round(user.viewing_stats.avg_completion_rate * 100)}%`}
                  color="yellow"
                />
                <StatBox
                  label="視聴時間"
                  value={`${user.viewing_stats.total_viewing_time}h`}
                  color="purple"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- 小さな統計パネル ---------- */
function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const styles: Record<typeof color, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className={`${styles[color]} p-3 rounded-lg`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
