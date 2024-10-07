// src\client\components\CommentSection.js
import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { getFirestore, collection, query, where, orderBy, addDoc, onSnapshot, runTransaction, doc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import ErrorMessage from "./ErrorMessage";
import LoadingSpinner from "./LoadingSpinner";

const CommentSectionContainer = styled.div`
  margin-top: 20px;
`;

const CommentForm = styled.form`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
`;

const SubmitButton = styled.button`
  align-self: flex-end;
  padding: 10px 20px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const CommentsList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const CommentItem = styled.li`
  margin-bottom: 15px;
  padding: 10px;
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: 4px;
`;

const CommentContent = styled.p`
  margin-bottom: 5px;
`;

const CommentMeta = styled.small`
  color: ${({ theme }) => theme.colors.textLight};
`;

const VoteButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 5px;
`;

const VoteButton = styled.button`
  background-color: transparent;
  border: none;
  cursor: pointer;
  color: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.textLight};
`;

const LoginPrompt = styled.p`
  margin-top: 10px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.textLight};
`;

const CommentSection = ({ videoId }) => {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const db = getFirestore();
    const commentsRef = collection(db, "comments");
    const q = query(
      commentsRef,
      where("videoId", "==", videoId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(fetchedComments);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching comments:", err);
      setError("コメントの読み込み中にエラーが発生しました。");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [videoId]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (newComment.trim() && user) {
      setIsSubmitting(true);
      try {
        const db = getFirestore();
        await addDoc(collection(db, "comments"), {
          content: newComment,
          videoId,
          userId: user.uid,
          username: user.displayName || "匿名ユーザー",
          createdAt: new Date(),
          upvotes: 0,
          downvotes: 0,
          userVotes: {}
        });

        setNewComment("");
      } catch (err) {
        console.error("Error posting comment:", err);
        setError("コメントの投稿中にエラーが発生しました。もう一度お試しください。");
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [newComment, videoId, user]);

  const handleVote = useCallback(async (commentId, voteType) => {
    if (!user) return;

    const db = getFirestore();
    const commentRef = doc(db, "comments", commentId);

    try {
      await runTransaction(db, async (transaction) => {
        const commentDoc = await transaction.get(commentRef);
        if (!commentDoc.exists()) {
          throw "Comment does not exist!";
        }

        const commentData = commentDoc.data();
        const userVotes = commentData.userVotes || {};
        const currentVote = userVotes[user.uid];

        let upvoteDelta = 0;
        let downvoteDelta = 0;

        if (currentVote === voteType) {
          // User is un-voting
          delete userVotes[user.uid];
          if (voteType === 'up') upvoteDelta = -1;
          else downvoteDelta = -1;
        } else {
          // User is voting or changing vote
          if (currentVote) {
            // Changing vote
            if (currentVote === 'up') upvoteDelta = -1;
            else downvoteDelta = -1;
          }
          userVotes[user.uid] = voteType;
          if (voteType === 'up') upvoteDelta++;
          else downvoteDelta++;
        }

        transaction.update(commentRef, {
          upvotes: commentData.upvotes + upvoteDelta,
          downvotes: commentData.downvotes + downvoteDelta,
          userVotes: userVotes
        });
      });
    } catch (err) {
      console.error("Error voting on comment:", err);
      setError("投票中にエラーが発生しました。もう一度お試しください。");
    }
  }, [user]);

  if (isLoading) return <LoadingSpinner aria-label="コメントを読み込み中" />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <CommentSectionContainer>
      <h2 id="comments-heading">コメント</h2>
      {user ? (
        <CommentForm onSubmit={handleSubmit} aria-labelledby="comments-heading">
          <CommentTextarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            aria-label="コメントを入力"
            required
          />
          <SubmitButton type="submit" disabled={!newComment.trim() || isSubmitting}>
            {isSubmitting ? "投稿中..." : "投稿"}
          </SubmitButton>
        </CommentForm>
      ) : (
        <LoginPrompt>コメントを投稿するにはログインしてください。</LoginPrompt>
      )}
      <CommentsList aria-label="コメント一覧">
        {comments.map((comment) => (
          <CommentItem key={comment.id}>
            <CommentContent>{comment.content}</CommentContent>
            <CommentMeta>
              {comment.username} - {new Date(comment.createdAt.toDate()).toLocaleString()}
            </CommentMeta>
            <VoteButtons>
              <VoteButton
                onClick={() => handleVote(comment.id, 'up')}
                active={user && comment.userVotes && comment.userVotes[user.uid] === 'up'}
                disabled={!user}
              >
                👍 {comment.upvotes}
              </VoteButton>
              <VoteButton
                onClick={() => handleVote(comment.id, 'down')}
                active={user && comment.userVotes && comment.userVotes[user.uid] === 'down'}
                disabled={!user}
              >
                👎 {comment.downvotes}
              </VoteButton>
            </VoteButtons>
          </CommentItem>
        ))}
      </CommentsList>
    </CommentSectionContainer>
  );
};

export default React.memo(CommentSection);