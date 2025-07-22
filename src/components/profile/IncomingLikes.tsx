import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MatchingUser } from '@/types/matching';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import UserCard from '@/components/matching/UserCard';
import { toast } from 'react-hot-toast';

export default function IncomingLikes() {
  const { user, isPremium, loading: loadingUser } = useAuth();
  const [incomingLikes, setIncomingLikes] = useState<MatchingUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchIncomingLikes = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: likesData, error: likesError } = await supabase
          .from('user_likes')
          .select('user_id')
          .eq('liked_user_id', user.id);

        if (likesError) {
          toast.error('データ取得に失敗しました');
          setLoading(false);
          return;
        }

        if (!likesData || likesData.length === 0) {
          setIncomingLikes([]);
          setLoading(false);
          return;
        }

        const userIds = likesData.map(item => item.user_id);

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, gender, birth_date, location, is_premium')
          .in('id', userIds);

        if (profilesError) {
          toast.error('プロフィール取得に失敗しました');
          setLoading(false);
          return;
        }

        const formattedProfiles = profilesData.map(profile => ({
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

        setIncomingLikes(formattedProfiles);

      } catch (error) {
        toast.error('データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchIncomingLikes();
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

  if (loadingUser || loading) return <LoadingSpinner />;

  if (incomingLikes.length === 0) {
    return <div className="text-center py-10 text-gray-700">あなたにいいねしたユーザーはいません。</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">あなたにいいねしたユーザー一覧</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {incomingLikes.map(user => (
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
