// src/components/matching/UserCard.tsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
 faPercent, 
 faHeart, 
 faLocationDot, 
 faCrown, 
 faClock, 
 faVideo, 
 faTag, 
 faThumbsUp,
 faForward,
 faExternalLinkAlt,
 faUserFriends,
 faEye,
 faUserPlus, // 接続リクエスト用アイコン追加
 faCheck, // 承認済みアイコン追加
 faHourglass, // 保留中アイコン追加
 faTimes // 拒否アイコン追加
} from '@fortawesome/free-solid-svg-icons';
import { MatchingUser, VideoDetails, OnlineStatus, ActivityLevel, ConnectionStatus } from '../../types/matching';
import { formatDistance } from 'date-fns';
import { ja } from 'date-fns/locale';

// インターフェース名を元に戻す
interface UserCardProps {
 user: MatchingUser;
 onLike: (userId: string) => Promise<boolean>;
 onSkip: (userId: string) => Promise<boolean>;
 onViewProfile?: (userId: string) => Promise<void>;
 onConnect?: (userId: string) => Promise<boolean>; // 接続リクエスト送信メソッド追加
 commonVideos?: VideoDetails[];
 isPremium?: boolean;
 hasDetailedView?: boolean;
 similarityScore?: number;
 showYouTubeLink?: boolean;
}

// インターフェース名を反映させる
const UserCard: React.FC<UserCardProps> = ({ 
 user,
 onLike,
 onSkip,
 onViewProfile,
 onConnect, // 接続リクエスト送信メソッド
 commonVideos = [],
 isPremium = false,
 hasDetailedView = false,
 similarityScore,
 showYouTubeLink = false
}) => {
 const defaultAvatar = '/default-avatar.jpg';
 const [isProcessing, setIsProcessing] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);
 const [showDetails, setShowDetails] = useState<boolean>(false);
 const [expandedVideos, setExpandedVideos] = useState<boolean>(false);
 const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(user.connection_status || ConnectionStatus.NONE);

 // ユーザーの接続状態が変更されたら内部状態を更新
 useEffect(() => {
   if (user.connection_status !== connectionStatus) {
     setConnectionStatus(user.connection_status || ConnectionStatus.NONE);
   }
 }, [user.connection_status, connectionStatus]);

 // マッチングスコアを視覚的に分かりやすくするための関数
 const getMatchScoreColor = (score: number) => {
   if (score >= 80) return 'text-green-500';
   if (score >= 60) return 'text-blue-500';
   if (score >= 40) return 'text-yellow-500';
   return 'text-gray-500';
 };

 // 活動レベルを表示用に変換
 const getActivityLevelText = (level?: ActivityLevel | number) => {
   if (level === undefined) return '不明';
   
   // 数値型の場合
   if (typeof level === 'number') {
     if (level >= 8) return '非常に活発';
     if (level >= 6) return '活発';
     if (level >= 4) return '普通';
     if (level >= 2) return 'やや静か';
     return '静か';
   }
   
   // ActivityLevel列挙型の場合
   switch (level) {
     case ActivityLevel.VERY_ACTIVE: return '非常に活発';
     case ActivityLevel.ACTIVE: return '活発';
     case ActivityLevel.MODERATE: return '普通';
     case ActivityLevel.CASUAL: return 'カジュアル';
     default: return '不明';
   }
 };

 // 活動レベルのカラー
 const getActivityLevelColor = (level?: ActivityLevel | number) => {
   if (level === undefined) return 'text-gray-500';
   
   // 数値型の場合
   if (typeof level === 'number') {
     if (level >= 8) return 'text-green-600';
     if (level >= 6) return 'text-green-500';
     if (level >= 4) return 'text-blue-500';
     if (level >= 2) return 'text-yellow-500';
     return 'text-gray-500';
   }
   
   // ActivityLevel列挙型の場合
   switch (level) {
     case ActivityLevel.VERY_ACTIVE: return 'text-green-600';
     case ActivityLevel.ACTIVE: return 'text-green-500';
     case ActivityLevel.MODERATE: return 'text-blue-500';
     case ActivityLevel.CASUAL: return 'text-yellow-500';
     default: return 'text-gray-500';
   }
 };

 // オンライン状態の表示
 const getOnlineStatus = () => {
   if (!user.online_status) return null;
   
   if (user.online_status === OnlineStatus.ONLINE) {
     return (
       <span className="inline-flex items-center text-green-600 text-xs">
         <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
         オンライン
       </span>
     );
   }
   
   if (user.last_active) {
     const lastActive = new Date(user.last_active);
     
     return (
       <span className="inline-flex items-center text-gray-500 text-xs">
         <span className="w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
         {formatDistance(lastActive, new Date(), { addSuffix: true, locale: ja })}にオンライン
       </span>
     );
   }
   
   return null;
 };

 // ユーザーの年齢表示
 const displayAge = user.age ? `${user.age}歳` : '';

 // ユーザーの地域表示
 const displayLocation = user.location && typeof user.location === 'object' && 'prefecture' in user.location && user.location.prefecture 
   ? user.location.prefecture 
   : (typeof user.location === 'string' ? user.location : '');

 // いいねボタンの処理
 const handleLike = async () => {
   if (isProcessing) return;
   
   setIsProcessing(true);
   setError(null);
   
   try {
     const success = await onLike(user.id);
     if (!success) {
       setError('処理に失敗しました。もう一度お試しください。');
     }
   } catch (err) {
     setError('エラーが発生しました。もう一度お試しください。');
     console.error('いいね処理でエラー:', err);
   } finally {
     setIsProcessing(false);
   }
 };

 // スキップボタンの処理
 const handleSkip = async () => {
   if (isProcessing) return;
   
   setIsProcessing(true);
   setError(null);
   
   try {
     const success = await onSkip(user.id);
     if (!success) {
       setError('処理に失敗しました。もう一度お試しください。');
     }
   } catch (err) {
     setError('エラーが発生しました。もう一度お試しください。');
     console.error('スキップ処理でエラー:', err);
   } finally {
     setIsProcessing(false);
   }
 };

 // 接続リクエスト送信処理
 const handleConnect = async () => {
   if (!onConnect || isProcessing) return;
   
   setIsProcessing(true);
   setError(null);
   
   try {
     const success = await onConnect(user.id);
     if (success) {
       // 一時的に状態を更新して即座にUIに反映
       setConnectionStatus(ConnectionStatus.PENDING);
     } else {
       setError('接続リクエストの送信に失敗しました。');
     }
   } catch (err) {
     setError('エラーが発生しました。もう一度お試しください。');
     console.error('接続リクエスト送信でエラー:', err);
   } finally {
     setIsProcessing(false);
   }
 };

 // 詳細プロフィール表示処理
 const handleViewProfile = async () => {
   if (!onViewProfile || isProcessing) return;
   
   setIsProcessing(true);
   setError(null);
   
   try {
     await onViewProfile(user.id);
     setShowDetails(true);
   } catch (err) {
     setError('プロフィールの取得に失敗しました。');
     console.error('プロフィール表示でエラー:', err);
   } finally {
     setIsProcessing(false);
   }
 };

 // 接続状態に基づくボタン表示
 const renderConnectionButton = () => {
   if (!isPremium || !onConnect) return null;
   
   switch (connectionStatus) {
     case ConnectionStatus.CONNECTED:
       return (
         <div className="mt-4">
           <span className="inline-flex items-center justify-center w-full py-2 bg-green-100 text-green-700 font-semibold rounded-lg">
             <FontAwesomeIcon icon={faCheck} className="mr-2" />
             つながり済み
           </span>
         </div>
       );
     case ConnectionStatus.PENDING:
       return (
         <div className="mt-4">
           <span className="inline-flex items-center justify-center w-full py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg">
             <FontAwesomeIcon icon={faHourglass} className="mr-2" />
             リクエスト中
           </span>
         </div>
       );
     case ConnectionStatus.REJECTED:
       return (
         <div className="mt-4">
           <span className="inline-flex items-center justify-center w-full py-2 bg-red-100 text-red-700 font-semibold rounded-lg">
             <FontAwesomeIcon icon={faTimes} className="mr-2" />
             接続できません
           </span>
         </div>
       );
     case ConnectionStatus.NONE:
     default:
       return (
         <div className="mt-4">
           <button
             onClick={handleConnect}
             disabled={isProcessing}
             className={`w-full py-2 flex items-center justify-center bg-indigo-500 text-white font-semibold rounded-lg transition-colors ${
               isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-600'
             }`}
           >
             <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
             {isProcessing ? '処理中...' : 'つながる'}
           </button>
         </div>
       );
   }
 };

 // 共通の関心事がある場合の表示
 const hasCommonInterests = 
   (user.common_interests && user.common_interests.length > 0) || 
   (user.common_genres && user.common_genres.length > 0);

 // YouTubeチャンネルへのリンク
 const renderYouTubeChannelLink = () => {
   if (!showYouTubeLink || !user.channel_url) return null;
   
   return (
     <a 
       href={user.channel_url}
       target="_blank"
       rel="noopener noreferrer"
       className="mt-2 inline-flex items-center text-xs text-red-600 hover:text-red-700"
     >
       <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
       YouTubeチャンネルを見る
     </a>
   );
 };

 // 視聴傾向の表示
 const renderViewingTrends = () => {
   if (!showDetails || !user.viewing_trends) return null;
   
   return (
     <div className="mt-4">
       <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
         <FontAwesomeIcon icon={faEye} className="mr-2 text-teal-500" />
         視聴傾向
       </h3>
       <div className="text-sm text-gray-600 space-y-1">
         {Object.entries(user.viewing_trends).map(([genre, percentage], index) => (
           <div key={index} className="flex items-center">
             <span className="w-24 truncate">{genre}</span>
             <div className="ml-2 flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-teal-500 rounded-full" 
                 style={{ width: `${percentage}%` }}
               ></div>
             </div>
             <span className="ml-2 text-xs">{percentage}%</span>
           </div>
         ))}
       </div>
     </div>
   );
 };

 // 共通の友達表示
 const renderCommonFriends = () => {
   if (!showDetails || !user.common_friends || user.common_friends.length === 0) return null;
   
   return (
     <div className="mt-4">
       <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
         <FontAwesomeIcon icon={faUserFriends} className="mr-2 text-indigo-500" />
         共通の友達: {user.common_friends.length}人
       </h3>
       <div className="flex -space-x-2 overflow-hidden">
         {user.common_friends.slice(0, 5).map((friend, index) => (
           <img
             key={index}
             className="inline-block h-8 w-8 rounded-full ring-2 ring-white"
             src={friend.avatar_url || defaultAvatar}
             alt={friend.username || '友達'}
           />
         ))}
         {user.common_friends.length > 5 && (
           <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-xs text-gray-700">
             +{user.common_friends.length - 5}
           </div>
         )}
       </div>
     </div>
   );
 };
 
 // すべての共通動画を表示
 const toggleExpandedVideos = () => {
   setExpandedVideos(!expandedVideos);
 };

 // 共通の視聴動画表示を強化
 const renderCommonVideos = () => {
   const hasCommonVideos = (user.common_videos_count !== undefined && user.common_videos_count > 0) || 
     (commonVideos && commonVideos.length > 0);
   
   if (!hasCommonVideos) return null;
   
   const videoCount = commonVideos?.length || user.common_videos_count || 0;
   const displayVideos = expandedVideos ? commonVideos : commonVideos?.slice(0, 3);
   
   return (
     <div className="mb-4">
       <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
         <FontAwesomeIcon icon={faVideo} className="mr-2 text-purple-500" />
         共通の視聴動画: {videoCount}本
       </h3>
       
       {/* 詳細表示が有効かつ共通の視聴動画がある場合 */}
       {(showDetails || (similarityScore && similarityScore > 70)) && commonVideos && commonVideos.length > 0 && (
         <>
           <div className="mt-2 space-y-2">
             {displayVideos?.map((video) => (
               <a 
                 key={video.id} 
                 href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded transition-colors"
               >
                 <img 
                   src={video.thumbnail_url} 
                   alt={video.title} 
                   className="w-16 h-10 object-cover rounded"
                 />
                 <div className="flex-1">
                   <span className="text-xs text-gray-700 line-clamp-2">{video.title}</span>
                   {video.channel_name && (
                     <span className="text-xs text-gray-500 block">{video.channel_name}</span>
                   )}
                 </div>
               </a>
             ))}
           </div>
           
           {commonVideos.length > 3 && (
             <button
               onClick={toggleExpandedVideos}
               className="text-xs text-indigo-600 hover:text-indigo-800 mt-2 focus:outline-none"
             >
               {expandedVideos ? '折りたたむ' : `他${commonVideos.length - 3}件の共通視聴動画を見る`}
             </button>
           )}
         </>
       )}
     </div>
   );
 };

 // 接続状態に基づいてアニメーション効果を追加
 const getCardClasses = () => {
   let classes = "w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden";
   
   // 接続状態に応じたボーダースタイルを適用
   if (connectionStatus === ConnectionStatus.CONNECTED) {
     classes += " border-2 border-green-500 transform transition-all duration-500";
   } else if (connectionStatus === ConnectionStatus.PENDING) {
     classes += " border-2 border-blue-500 transform transition-all duration-500";
   } else if (connectionStatus === ConnectionStatus.REJECTED) {
     classes += " border-2 border-red-500 transform transition-all duration-500";
   }
   
   return classes;
 };

 return (
   <div className={getCardClasses()}>
     {/* 接続状態のバッジ表示 - 新規追加 */}
     {connectionStatus !== ConnectionStatus.NONE && (
       <div className={`absolute top-0 left-0 z-10 px-3 py-1 font-semibold text-xs ${
         connectionStatus === ConnectionStatus.CONNECTED ? 'bg-green-500 text-white' :
         connectionStatus === ConnectionStatus.PENDING ? 'bg-blue-500 text-white' :
         'bg-red-500 text-white'
       }`}>
         {connectionStatus === ConnectionStatus.CONNECTED ? 'つながり済み' :
          connectionStatus === ConnectionStatus.PENDING ? 'リクエスト中' :
          '接続拒否'}
       </div>
     )}
     
     {/* ユーザーカードヘッダー */}
     <div className="relative h-48 bg-gradient-to-r from-indigo-500 to-purple-500">
       {/* プレミアムバッジ */}
       {user.is_premium && (
         <div className="absolute top-2 right-2 bg-yellow-400 text-white px-2 py-1 rounded-full text-xs flex items-center">
           <FontAwesomeIcon icon={faCrown} className="mr-1" />
           プレミアム
         </div>
       )}
       
       <div className="absolute inset-0 flex items-center justify-center">
         <img
           src={user.avatar_url || defaultAvatar}
           alt={`${user.username || '名前なし'}のアバター`}
           className="h-32 w-32 rounded-full border-4 border-white object-cover"
           onError={(e) => {
             const target = e.target as HTMLImageElement;
             target.onerror = null;
             target.src = defaultAvatar;
           }}
         />
       </div>
     </div>
     
     {/* ユーザー情報 */}
     <div className="p-6">
       <div className="flex justify-between items-start mb-2">
         <div>
           <h2 className="text-2xl font-bold text-gray-800">{user.username || '名前なし'}</h2>
           
           {(displayAge || displayLocation) && (
             <div className="flex items-center text-gray-600 text-sm mt-1">
               {displayAge && <span className="mr-2">{displayAge}</span>}
               {displayLocation && (
                 <span className="flex items-center">
                   <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
                   {displayLocation}
                 </span>
               )}
             </div>
           )}
           {getOnlineStatus() && (
             <div className="mt-1">
               {getOnlineStatus()}
             </div>
           )}
           {renderYouTubeChannelLink()}
         </div>
         
         <div className={`flex items-center ${getMatchScoreColor(user.matching_score || similarityScore || 0)}`}>
           <FontAwesomeIcon icon={faPercent} className="mr-1" />
           <span className="font-bold">{Math.round(user.matching_score || similarityScore || 0)}%</span>
         </div>
       </div>
       
       {/* 自己紹介 */}
       <p className="text-gray-600 mb-4 line-clamp-3 min-h-[4.5rem]">
         {user.bio || 'まだ自己紹介文が設定されていません。'}
       </p>
       
       {/* 活動レベル */}
       {user.activity_level !== undefined && (
         <div className="mb-4 flex items-center">
           <FontAwesomeIcon icon={faClock} className={`mr-2 ${getActivityLevelColor(user.activity_level)}`} />
           <span className="text-sm">
             活動レベル：
             <span className={getActivityLevelColor(user.activity_level)}>
               {getActivityLevelText(user.activity_level)}
             </span>
           </span>
         </div>
       )}
       
       {/* 共通の関心事 */}
       {user.common_interests && user.common_interests.length > 0 && (
         <div className="mb-4">
           <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
             <FontAwesomeIcon icon={faHeart} className="mr-2 text-rose-500" />
             共通の興味
           </h3>
           <div className="flex flex-wrap gap-2">
             {user.common_interests.slice(0, 5).map((interest, index) => (
               <span
                 key={index}
                 className="px-2 py-1 bg-rose-100 text-rose-800 text-xs rounded-full"
               >
                 {interest}
               </span>
             ))}
             {user.common_interests.length > 5 && (
               <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                 +{user.common_interests.length - 5}
               </span>
             )}
           </div>
         </div>
       )}
       
       {/* 共通のジャンル */}
       {user.common_genres && user.common_genres.length > 0 && (
         <div className="mb-4">
           <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
             <FontAwesomeIcon icon={faTag} className="mr-2 text-blue-500" />
             共通のジャンル
           </h3>
           <div className="flex flex-wrap gap-2">
             {user.common_genres.slice(0, 5).map((genre, index) => (
               <span
                 key={index}
                 className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
               >
                 {genre}
               </span>
             ))}
             {user.common_genres.length > 5 && (
               <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                 +{user.common_genres.length - 5}
               </span>
             )}
           </div>
         </div>
       )}
       
       {/* 共通の視聴動画 */}
       {renderCommonVideos()}
       
       {/* 視聴傾向 */}
       {renderViewingTrends()}
       
       {/* 共通の友達 */}
       {renderCommonFriends()}
       
       {/* 興味タグ（共通の関心事がない場合のみ表示） */}
       {!hasCommonInterests && (
         <div className="mb-4">
           <h3 className="text-sm font-semibold text-gray-700 mb-2">興味・関心</h3>
           <div className="flex flex-wrap gap-2">
             {user.interests && user.interests.length > 0 ? (
               <>
                 {user.interests.slice(0, 5).map((interest, index) => (
                   <span
                     key={index}
                     className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                   >
                     {interest}
                   </span>
                 ))}
                 {user.interests.length > 5 && (
                   <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                     +{user.interests.length - 5}
                   </span>
                 )}
               </>
             ) : (
               <span className="text-gray-500 text-sm">未設定</span>
             )}
           </div>
         </div>
       )}
       
       {/* エラーメッセージ */}
       {error && (
         <div className="mt-4 p-2 bg-red-100 text-red-700 text-sm rounded">
           {error}
         </div>
       )}
       
       {/* 詳細プロフィールボタン */}
       {hasDetailedView && onViewProfile && !showDetails && (
         <div className="mt-4">
           <button
             onClick={handleViewProfile}
             disabled={isProcessing}
             className={`w-full py-2 bg-indigo-500 text-white font-semibold rounded-lg transition-colors ${
               isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-600'
             }`}
           >
             {isProcessing ? '読込中...' : '詳細プロフィールを見る (5ポイント)'}
           </button>
           {isPremium && (
             <p className="text-xs text-center mt-1 text-indigo-600">
               プレミアム会員はポイント消費なし
             </p>
           )}
         </div>
       )}
       
       {/* 接続ボタン表示 - 新規追加 */}
       {renderConnectionButton()}
       
       {/* アクションボタン */}
       <div className="mt-6 flex justify-between">
         <button
           onClick={handleSkip}
           disabled={isProcessing}
           className={`flex items-center px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors ${
             isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'
           }`}
         >
           <FontAwesomeIcon icon={faForward} className="mr-2" />
           スキップ
         </button>
         <button
           onClick={handleLike}
           disabled={isProcessing}
           className={`flex items-center px-6 py-2 bg-rose-500 text-white font-semibold rounded-lg transition-colors ${
             isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-600'
           }`}
         >
           <FontAwesomeIcon icon={faThumbsUp} className="mr-2" />
           {isProcessing ? '処理中...' : 'いいね！'}
         </button>
       </div>
       
       {/* プレミアム会員への案内（非プレミアム会員向け） */}
       {!isPremium && (
         <div className="mt-4 p-2 bg-yellow-50 text-sm text-amber-700 rounded-lg">
           プレミアム会員になると、ポイント消費なしでマッチングできます。
         </div>
       )}
     </div>
   </div>
 );
};

export default UserCard;