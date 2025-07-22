import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MatchingUser } from '@/types/matching';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UserCard from '@/components/matching/UserCard';
import { toast } from 'react-hot-toast';

export default function MatchHistory() {
  const { user, isPremium, loading: loadingUser } = useAuth();
  const [matchedUsers, setMatchedUsers] = useState<MatchingUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMatchedUsers = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: matchesData, error: matchesError } = await supabase
          .from('user_matches')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        if (matchesError) {
          toast.error('マッチ履歴の取得に失敗しました');
          setLoading(false);
          return;
        }

        if (!matchesData || matchesData.length === 0) {
          setMatchedUsers([]);
          setLoading(false);
          return;
        }

        const otherUserIds = matchesData.map(match =>
          match.user1_id === user.id ? match.user2_id : match.user1_id
        );

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, gender, birth_date, location, is_premium')
          .in('id', otherUserIds);

        if (profilesError) {
          toast.error('プロフィール取得に失敗しました');
          setLoading(false);
          return;
        }

        const formattedProfiles: MatchingUser[] = profilesData.map(profile => ({
          id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          gender: profile.gender,
          age: profile.birth_date ? calculateAge(profile.birth_date) : null,
          location: profile.location,
          is_premium: profile.is_premium,
          matching_score: 0,
          interests: [],
          common_interests: [],
        }));

        setMatchedUsers(formattedProfiles);

      } catch (error) {
        console.error('マッチ履歴取得エラー:', error);
        toast.error('データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchedUsers();
  }, [user]);

  function calculateAge(birthDateStr: string): number | null {
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  if (loadingUser || loading) {
    return <LoadingSpinner />;
  }

  if (matchedUsers.length === 0) {
    return <div className="text-center py-10 text-gray-700">マッチ成立履歴がありません。</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">マッチ成立ユーザー一覧</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {matchedUsers.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onLike={() => Promise.resolve(false)}
            onSkip={() => Promise.resolve(false)}
            hasDetailedView={false}
            showYouTubeLink={false}
            isPremium={isPremium}
            userGender={user.gender}
            isPhoneVerified={false}
          />
        ))}
      </div>
    </div>
  );
}
