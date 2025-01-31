import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface MatchedUser {
  id: string;
  username: string;
  avatar_url?: string;
  interests: string[];
  matchScore: number;
}

export default function MatchingSystem() {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    fetchMatches();
  }, [currentUser]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      
      // ユーザーの視聴履歴とお気に入りを取得
      const { data: userHistory } = await supabase
        .from('view_history')
        .select('video_id')
        .eq('user_id', currentUser!.id);

      const { data: userFavorites } = await supabase
        .from('favorites')
        .select('video_id')
        .eq('user_id', currentUser!.id);

      // 他のユーザーの視聴履歴とお気に入りを取得
      const { data: otherUsers } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', currentUser!.id);

      if (!otherUsers) return;

      // マッチングスコアの計算
      const matchedUsers = await Promise.all(
        otherUsers.map(async (user) => {
          const { data: userVideos } = await supabase
            .from('view_history')
            .select('video_id')
            .eq('user_id', user.id);

          const { data: userFavs } = await supabase
            .from('favorites')
            .select('video_id')
            .eq('user_id', user.id);

          // 共通の視聴履歴とお気に入りを計算
          const commonHistory = userHistory?.filter(h => 
            userVideos?.some(v => v.video_id === h.video_id)
          );

          const commonFavorites = userFavorites?.filter(f => 
            userFavs?.some(v => v.video_id === f.video_id)
          );

          // ジャンルの類似性を計算
          const { data: genres } = await supabase
            .from('user_interests')
            .select('genre')
            .eq('user_id', user.id);

          // マッチングスコアの計算（0-100）
          const historyScore = (commonHistory?.length || 0) * 2;
          const favoriteScore = (commonFavorites?.length || 0) * 3;
          const genreScore = (genres?.length || 0) * 5;

          const totalScore = Math.min(
            Math.round((historyScore + favoriteScore + genreScore) / 3),
            100
          );

          return {
            ...user,
            interests: genres?.map(g => g.genre) || [],
            matchScore: totalScore
          };
        })
      );

      // スコアでソート
      const sortedMatches = matchedUsers.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(sortedMatches.slice(0, 10)); // 上位10件のみ表示

    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('マッチングの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId: string) => {
    try {
      await supabase.from('connections').insert([{
        user_id: currentUser!.id,
        connected_user_id: userId,
        status: 'pending'
      }]);
      
      // マッチリストを更新
      fetchMatches();
    } catch (err) {
      console.error('Error connecting:', err);
      setError('接続リクエストの送信に失敗しました');
    }
  };

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">マッチング機能を利用するにはログインが必要です。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">おすすめのユーザー</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          マッチするユーザーが見つかりませんでした
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
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
                  <h3 className="text-lg font-medium text-gray-900">
                    {match.username}
                  </h3>
                  <div className="mt-1 flex items-center">
                    <div className="text-sm text-gray-500">
                      マッチ度: {match.matchScore}%
                    </div>
                    {match.interests.length > 0 && (
                      <div className="ml-4 flex gap-1">
                        {match.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleConnect(match.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  つながる
                </button>
                <div className="flex space-x-1">
                  <button className="p-2 text-gray-400 hover:text-green-500">
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-500">
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}