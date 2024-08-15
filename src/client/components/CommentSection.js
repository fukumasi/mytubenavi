import React, { useState, useEffect } from "react";
import axios from "axios";

const CommentSection = ({ videoId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`/api/videos/${videoId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/videos/${videoId}/comments`, {
        content: newComment,
      });
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  return (
    <div className="comment-section">
      <h2>コメント</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="コメントを入力..."
        ></textarea>
        <button type="submit">投稿</button>
      </form>
      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment._id} className="comment">
            <p>{comment.content}</p>
            <small>
              by {comment.user.username} on{" "}
              {new Date(comment.createdAt).toLocaleString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSection;
