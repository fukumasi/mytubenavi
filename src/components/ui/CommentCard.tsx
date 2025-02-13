import React from 'react';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import type { Comment } from '../../types/comment';

interface CommentCardProps {
  comment: Comment;
  onVideoClick?: (videoId: string) => void;
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment, onVideoClick }) => {
  if (!comment.created_at) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      {comment.videos && (
        <div 
          onClick={() => onVideoClick?.(comment.video_id)}
          className="flex items-center space-x-3 mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
        >
          <img
            src={comment.videos.thumbnail}
            alt={comment.videos.title}
            className="w-24 h-16 object-cover rounded"
          />
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {comment.videos.title}
          </h3>
        </div>
      )}

      <div className="flex items-start space-x-3">
        {comment.profiles?.avatar_url && (
          <img
            src={comment.profiles.avatar_url}
            alt={comment.profiles.username}
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {comment.profiles?.username}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('ja-JP')}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            {comment.likes_count > 0 && (
              <div className="flex items-center space-x-1">
                <ThumbsUp className="w-4 h-4" />
                <span>{comment.likes_count}</span>
              </div>
            )}
            {comment.replies_count > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-4 h-4" />
                <span>{comment.replies_count}件の返信</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentCard;