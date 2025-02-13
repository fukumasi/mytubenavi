import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';
import { supabase } from '../../lib/supabase';
import { CommentCard } from '../ui/CommentCard';
import type { Comment } from '../../types/comment';

export default function CommentHistory() {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('認証されていません');

        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            profiles (
              id,
              username,
              avatar_url
            ),
            videos (
              title,
              thumbnail
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setComments(data || []);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('コメントの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-indigo-600 hover:text-indigo-500"
          >
            再読み込み
          </button>
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">まだコメントを投稿していません。</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-indigo-600 hover:text-indigo-500"
          >
            動画を探す
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            onVideoClick={handleVideoClick}
          />
        ))}
      </div>
    );
  };

  return (
    <ProfileLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">コメント履歴</h2>
          <span className="text-sm text-gray-500">
            {!loading && !error && `${comments.length}件のコメント`}
          </span>
        </div>
        {renderContent()}
      </div>
    </ProfileLayout>
  );
}