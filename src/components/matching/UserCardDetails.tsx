// src/components/matching/UserCardDetails.tsx

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart,
  faTag,
  faVideo,
  faEye,
  faUserFriends,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { MatchingUser, VideoDetails } from '@/types/matching';
import { Link } from 'react-router-dom';

interface UserCardDetailsProps {
  user: MatchingUser;
  commonVideos?: VideoDetails[];
  showYouTubeLink?: boolean;
  isPremium?: boolean;
  userGender?: string | null;
  isPhoneVerified?: boolean;
}

const UserCardDetails = ({
  user,
  commonVideos = [],
  showYouTubeLink = false,
  isPremium = false,
  userGender = null,
  isPhoneVerified = false,
}: UserCardDetailsProps): JSX.Element => {
  const hasCommonInterests = user.common_interests && user.common_interests.length > 0;
  const hasCommonGenres = user.common_genres && user.common_genres.length > 0;
  const hasInterests = user.interests && user.interests.length > 0;
  const hasCommonVideos = commonVideos.length > 0 || (user.common_videos_count && user.common_videos_count > 0);
  const hasViewingTrends = user.viewing_trends && Object.keys(user.viewing_trends).length > 0;
  const hasCommonFriends = user.common_friends && user.common_friends.length > 0;

  return (
    <div className="space-y-6 mt-4">
      {/* 自己紹介 */}
      {user.bio && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">自己紹介</h3>
          <p className="text-sm text-gray-600">{user.bio}</p>
        </div>
      )}

      {/* 共通の興味 */}
      {hasCommonInterests && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <FontAwesomeIcon icon={faHeart} className="mr-2 text-rose-500" />
            共通の興味
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.common_interests?.map((interest, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs rounded-full">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 共通のジャンル */}
      {hasCommonGenres && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <FontAwesomeIcon icon={faTag} className="mr-2 text-blue-500" />
            共通のジャンル
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.common_genres?.map((genre, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 興味・関心 */}
      {!hasCommonInterests && !hasCommonGenres && hasInterests && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">興味・関心</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests?.map((interest, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 共通の視聴動画 */}
      {hasCommonVideos && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <FontAwesomeIcon icon={faVideo} className="mr-2 text-purple-500" />
            共通の視聴動画
          </h3>
          <p className="text-sm text-gray-600">
            {user.common_videos_count ? `${user.common_videos_count}本` : `${commonVideos.length}本`}の共通動画があります。
          </p>
        </div>
      )}

      {/* 視聴傾向 */}
      {hasViewingTrends && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <FontAwesomeIcon icon={faEye} className="mr-2 text-teal-500" />
            視聴傾向
          </h3>
          <div className="text-sm text-gray-600">
            {Object.entries(user.viewing_trends ?? {}).map(([genre, percent], idx) => (
              <div key={idx} className="flex items-center">
                <span className="w-24 truncate">{genre}</span>
                <div className="ml-2 flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500"
                    style={{ width: `${Math.min(100, Math.max(0, percent as number))}%` }}
                  />
                </div>
                <span className="ml-2">{Math.round(percent as number)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 共通の友達 */}
      {hasCommonFriends && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <FontAwesomeIcon icon={faUserFriends} className="mr-2 text-indigo-500" />
            共通の友達
          </h3>
          <p className="text-sm text-gray-600">{user.common_friends?.length}人の共通の友達がいます。</p>
        </div>
      )}

      {/* YouTubeチャンネルリンク */}
      {showYouTubeLink && user.channel_url && (
        <div className="text-center">
          <Link
            to={user.channel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-red-600 hover:text-red-700"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
            YouTubeチャンネルを見る
          </Link>
        </div>
      )}

      {/* プレミアム・認証特典メッセージ */}
      {(isPremium || (userGender === 'female' && isPhoneVerified)) && (
        <div className="text-center text-xs text-purple-600">
          {isPremium ? 'プレミアム会員特典' : '認証済み女性特典'}適用中
        </div>
      )}
    </div>
  );
};

export default UserCardDetails;
