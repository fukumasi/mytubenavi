import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MatchingUser } from '@/types/matching';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UserCard from '@/components/matching/UserCard';
import { toast } from 'react-hot-toast';

export default function LikedUsers() {
  const { user, isPremium, loading: loadingUser } = useAuth();
  const [likedUsers, setLikedUsers] = useState<MatchingUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLikedUsers = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: likesData, error: likesError } = await supabase
          .from('user_likes')
          .select('liked_user_id')
          .eq('user_id', user.id);

        if (likesError) {
          console.error('いいね履歴取得エラー:', likesError);
          toast.error('いいね履歴の取得に失敗しました');
          setLoading(false);
          return;
        }

        if (!likesData || likesData.length === 0) {
          setLikedUsers([]);
          setLoading(false);
          return;
        }

        const likedUserIds = likesData.map(item => item.liked_user_id);

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, gender, birth_date, location, is_premium')
          .in('id', likedUserIds);

        if (profilesError) {
          console.error('プロフィール取得エラー:', profilesError);
          toast.error('プロフィールの取得に失敗しました');
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

        setLikedUsers(formattedProfiles);

      } catch (error) {
        console.error('いいねユーザー取得エラー:', error);
        toast.error('データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchLikedUsers();
  }, [user]);

  function calculateAge(birthDateStr: string): number | null {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  if (loadingUser || loading) {
    return <div className="flex justify-center py-10"><LoadingSpinner /></div>;
  }

  if (likedUsers.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-700">いいね履歴がありません。</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">いいねしたユーザー一覧</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {likedUsers.map(user => (
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
