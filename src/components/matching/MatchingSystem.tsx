// src/components/matching/MatchingSystem.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, MessageCircle, ThumbsUp, ThumbsDown, Crown, Lock, Users, Star, Clock as ClockIcon } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Link } from 'react-router-dom';

interface MatchedUser {
  id: string;
  username: string;
  avatar_url?: string;
  interests: string[];
  matchScore: number;
  is_premium?: boolean;
  connection_status?: 'none' | 'pending' | 'connected' | 'rejected';
}

interface MatchingSystemProps {
  limit?: number;
}

export default function MatchingSystem({ limit }: MatchingSystemProps) {
  const { user, isPremium } = useAuth();
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 表示件数の決定（プロップスで上書き可能）
  const calculateLimit = () => {
    if (limit) return limit;
    return isPremium ? 10 : 3;
  };

  useEffect(() => {
    if (!user) return;
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // ユーザーの視聴履歴とお気に入りを取得
      const { data: userHistory, error: historyError } = await supabase
        .from('view_history')
        .select('video_id')
        .eq('id', user.id);

      if (historyError) {
        console.error('視聴履歴の取得エラー:', historyError);
        throw historyError;
      }

      const { data: userFavorites, error: favoritesError } = await supabase
        .from('favorites')
        .select('video_id')
        .eq('id', user.id);

      if (favoritesError) {
        console.error('お気に入りの取得エラー:', favoritesError);
        throw favoritesError;
      }

      // ユーザーの興味ジャンルを取得
      const { data: userInterests, error: interestsError } = await supabase
        .from('user_interests')
        .select('genre')
        .eq('id', user.id);

      if (interestsError) {
        console.error('興味ジャンルの取得エラー:', interestsError);
        throw interestsError;
      }

      // 既存の接続リクエストを取得
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('connected_user_id, status')
        .eq('id', user.id);

      if (connectionsError) {
        console.error('接続情報の取得エラー:', connectionsError);
        throw connectionsError;
      }

      // 他のユーザーの情報を取得
      const { data: otherUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_premium')
        .neq('id', user.id);

      if (usersError) {
        console.error('ユーザー情報の取得エラー:', usersError);
        throw usersError;
      }

      if (!otherUsers || otherUsers.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // マッチングスコアの計算
      const matchedUsers = await Promise.all(
        otherUsers.map(async (otherUser) => {
          // 既存の接続状態を確認
          const existingConnection = connections?.find(c => c.connected_user_id === otherUser.id);
          const connectionStatus = existingConnection 
            ? existingConnection.status as 'pending' | 'connected' | 'rejected'
            : 'none';

          const { data: userVideos, error: videosError } = await supabase
            .from('view_history')
            .select('video_id')
            .eq('id', otherUser.id);

          if (videosError) {
            console.error(`ユーザー${otherUser.id}の視聴履歴取得エラー:`, videosError);
            return null;
          }

          const { data: userFavs, error: favsError } = await supabase
            .from('favorites')
            .select('video_id')
            .eq('id', otherUser.id);

          if (favsError) {
            console.error(`ユーザー${otherUser.id}のお気に入り取得エラー:`, favsError);
            return null;
          }

          // 共通の視聴履歴とお気に入りを計算
          const commonHistory = userHistory?.filter(h => 
            userVideos?.some(v => v.video_id === h.video_id)
          ) || [];

          const commonFavorites = userFavorites?.filter(f => 
            userFavs?.some(v => v.video_id === f.video_id)
          ) || [];

          // ジャンルの類似性を計算
          const { data: genres, error: genresError } = await supabase
            .from('user_interests')
            .select('genre')
            .eq('id', otherUser.id);

          if (genresError) {
            console.error(`ユーザー${otherUser.id}の興味ジャンル取得エラー:`, genresError);
            return null;
          }

          // 共通の趣味・興味を計算
          const userGenres = userInterests?.map(i => i.genre) || [];
          const otherGenres = genres?.map(g => g.genre) || [];
          const commonGenres = userGenres.filter(g => otherGenres.includes(g));

          // マッチングスコアの計算（0-100）
          // プレミアム会員はより詳細なマッチングスコア計算
          let historyScore = commonHistory.length * 2;
          let favoriteScore = commonFavorites.length * 3;
          let genreScore = commonGenres.length * 5;
          
          // プレミアム会員同士は追加ボーナス
          const premiumBonus = (isPremium && otherUser.is_premium) ? 10 : 0;

          // 最終スコアの計算
          const totalScore = Math.min(
            Math.round((historyScore + favoriteScore + genreScore) / 3) + premiumBonus,
            100
          );

          return {
            ...otherUser,
            interests: genres?.map(g => g.genre) || [],
            matchScore: totalScore,
            connection_status: connectionStatus
          };
        })
      );

      // nullを除外してスコアでソート
      const validMatches = matchedUsers.filter(match => match !== null) as MatchedUser[];
      const sortedMatches = validMatches.sort((a, b) => b.matchScore - a.matchScore);
      
      // 表示件数を計算（プロップスで上書き可能）
      const displayLimit = calculateLimit();
      setMatches(sortedMatches);
      
      // 表示件数を超える場合は「もっと見る」を表示するフラグを設定
      setShowMore(sortedMatches.length > displayLimit && !limit);

    } catch (err) {
      console.error('マッチング取得エラー:', err);
      setError('マッチングの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId: string) => {
    if (!user) return;
    
    // プレミアム会員でない場合は接続できない
    if (!isPremium) {
      alert('この機能はプレミアム会員限定です');
      return;
    }

    try {
      setIsProcessing(true);

      const { error: connectionError } = await supabase
        .from('connections')
        .insert([{
          id: user.id,
          connected_user_id: userId,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
      
      if (connectionError) {
        console.error('接続リクエストのエラー:', connectionError);
        throw connectionError;
      }
      
      // 通知テーブルに通知を追加
      await supabase
        .from('notifications')
        .insert([{
          id: userId,
          type: 'connection_request',
          title: '新しい接続リクエスト',
          message: `${user.user_metadata?.name || '新しいユーザー'}さんから接続リクエストが届きました。`,
          is_read: false,
          priority: 'medium',
          created_at: new Date().toISOString()
        }]);
      
      // マッチリストを更新
      await fetchMatches();
      
      // 完了メッセージ
      alert('接続リクエストを送信しました');
    } catch (err) {
      console.error('接続エラー:', err);
      setError('接続リクエストの送信に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReaction = async (userId: string, isPositive: boolean) => {
    if (!user || !isPremium) return;
    
    try {
      setIsProcessing(true);
      
      // 反応を記録
      const { error: reactionError } = await supabase
        .from('user_reactions')
        .insert([{
          id: user.id,
          target_user_id: userId,
          reaction_type: isPositive ? 'like' : 'dislike',
          created_at: new Date().toISOString()
        }]);
      
      if (reactionError) {
        console.error('反応の記録エラー:', reactionError);
        throw reactionError;
      }
      
      // マッチリストを更新
      await fetchMatches();
      
    } catch (err) {
      console.error('反応の記録エラー:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // レコメンドのないユーザーにサンプルデータを表示（開発用・後で削除）
  const showSampleData = () => {
    const sampleMatches: MatchedUser[] = [
      {
        id: '1',
        username: '山田太郎',
        interests: ['アニメ', '映画', 'ゲーム', 'スポーツ', '音楽'],
        matchScore: 85,
        is_premium: true,
        connection_status: 'none'
      },
      {
        id: '2',
        username: '佐藤花子',
        interests: ['料理', '旅行', 'DIY', 'アウトドア', 'ペット'],
        matchScore: 72,
        is_premium: false,
        connection_status: 'none'
      },
      {
        id: '3',
        username: '鈴木一郎',
        interests: ['スポーツ', 'テクノロジー', '読書', '映画', '音楽'],
        matchScore: 68,
        is_premium: true,
        connection_status: 'none'
      },
      {
        id: '4',
        username: '高橋京子',
        interests: ['ファッション', '美容', '料理', '旅行', 'カフェ'],
        matchScore: 65,
        is_premium: false,
        connection_status: 'none'
      },
      {
        id: '5',
        username: '中村健太',
        interests: ['ゲーム', 'プログラミング', 'アニメ', '漫画', 'テクノロジー'],
        matchScore: 60,
        is_premium: true,
        connection_status: 'none'
      }
    ];
    
    setMatches(sampleMatches);
    setShowMore(sampleMatches.length > calculateLimit() && !limit);
    setLoading(false);
  };

  // 開発環境でマッチングがない場合にサンプルデータを表示
  useEffect(() => {
    if (!loading && matches.length === 0 && process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        showSampleData();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, matches.length]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">マッチング機能を利用するにはログインが必要です。</p>
        <Link 
          to="/login" 
          className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          ログインする
        </Link>
      </div>
    );
  }

  // 表示件数を計算
  const displayLimit = calculateLimit();
  const displayedMatches = limit ? matches.slice(0, limit) : (showMore ? matches : matches.slice(0, displayLimit));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">おすすめのユーザー</h2>
        {isPremium ? (
          <span className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
            <Crown className="w-4 h-4 mr-1.5 text-yellow-600" />
            プレミアム機能
          </span>
        ) : (
          <Link 
            to="/premium" 
            className="flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <Lock className="w-4 h-4 mr-1" />
            プレミアムへアップグレード
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          マッチするユーザーが見つかりませんでした
        </div>
      ) : (
        <div className="space-y-4">
          {displayedMatches.map((match) => (
            <div
              key={match.id}
              className={`bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                match.is_premium ? 'border-l-4 border-yellow-400' : ''
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                  match.is_premium ? 'ring-2 ring-yellow-400' : 'bg-gray-200'
                }`}>
                  {match.avatar_url ? (
                    <img
                      src={match.avatar_url}
                      alt={match.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {match.username}
                    </h3>
                    {match.is_premium && (
                      <Crown className="w-4 h-4 ml-1.5 text-yellow-500" />
                    )}
                  </div>
                  <div className="mt-1">
                    <div className="text-sm text-gray-500 flex items-center">
                      マッチ度: 
                      <div className="ml-1 flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${
                              i < Math.floor(match.matchScore/20) 
                                ? 'text-yellow-500 fill-yellow-500' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="ml-1 font-semibold text-indigo-600">{match.matchScore}%</span>
                    </div>
                    {match.interests.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {match.interests.slice(0, isPremium ? 5 : 2).map((interest, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                        {match.interests.length > (isPremium ? 5 : 2) && (
                          <span className="text-xs text-gray-500">+{match.interests.length - (isPremium ? 5 : 2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-auto">
                {match.connection_status === 'connected' ? (
                  <span className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-green-700 bg-green-100">
                    <Users className="w-4 h-4 mr-1.5" />
                    つながり済み
                  </span>
                ) : match.connection_status === 'pending' ? (
                  <span className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-700 bg-blue-100">
                    <ClockIcon className="w-4 h-4 mr-1.5" />
                    リクエスト中
                  </span>
                ) : isPremium ? (
                  <button
                    onClick={() => handleConnect(match.id)}
                    disabled={isProcessing}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <span className="mr-1.5">処理中...</span>
                    ) : (
                      <MessageCircle className="w-4 h-4 mr-1.5" />
                    )}
                    つながる
                  </button>
                ) : (
                  <Link
                    to="/premium"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Lock className="w-4 h-4 mr-1.5" />
                    プレミアム限定
                  </Link>
                )}
                
                {isPremium && match.connection_status === 'none' && (
                  <div className="flex space-x-1">
                    <button 
                      className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                      onClick={() => handleReaction(match.id, true)}
                      disabled={isProcessing}
                    >
                      <ThumbsUp className="w-5 h-5" />
                    </button>
                    <button 
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      onClick={() => handleReaction(match.id, false)}
                      disabled={isProcessing}
                    >
                      <ThumbsDown className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* プレミアム会員でない場合はもっと見るボタンを表示 */}
          {!isPremium && matches.length > displayLimit && !limit && (
            <div className="pt-4">
              <Link
                to="/premium"
                className="block w-full py-3 px-4 text-center bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 text-yellow-700 font-medium rounded-lg transition-colors"
              >
                <Crown className="inline-block w-5 h-5 mr-2 text-yellow-500" />
                プレミアム会員になって{matches.length - displayLimit}人以上のマッチングを見る
              </Link>
            </div>
          )}
          
          {/* プレミアム会員で表示制限がある場合のもっと見るボタン */}
          {isPremium && !showMore && matches.length > displayLimit && !limit && (
            <button
              onClick={() => setShowMore(true)}
              className="block w-full py-3 px-4 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors"
            >
              すべて表示（{matches.length}人）
            </button>
          )}
          
          {/* プレミアム会員の詳細ページへのリンク */}
          {isPremium && limit && matches.length > limit && (
            <div className="pt-4 text-center">
              <Link
                to="/premium/matching"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
              >
                すべてのマッチングを見る
                <Users className="ml-2 w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}