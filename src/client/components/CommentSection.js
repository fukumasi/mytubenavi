// src\client\components\CommentSection.js
import React, { useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { getFirestore, collection, query, where, orderBy, addDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
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

const CommentSection = ({ videoId }) => {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (newComment.trim()) {
      setIsSubmitting(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          throw new Error("ユーザーがログインしていません。");
        }

        const db = getFirestore();
        await addDoc(collection(db, "comments"), {
          content: newComment,
          videoId,
          userId: user.uid,
          username: user.displayName || "匿名ユーザー",
          createdAt: new Date()
        });

        setNewComment("");
      } catch (err) {
        console.error("Error posting comment:", err);
        alert("コメントの投稿中にエラーが発生しました。もう一度お試しください。");
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [newComment, videoId]);

  if (isLoading) return <LoadingSpinner aria-label="コメントを読み込み中" />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <CommentSectionContainer>
      <h2 id="comments-heading">コメント</h2>
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
      <CommentsList aria-label="コメント一覧">
        {comments.map((comment) => (
          <CommentItem key={comment.id}>
            <CommentContent>{comment.content}</CommentContent>
            <CommentMeta>
              {comment.username} - {new Date(comment.createdAt.toDate()).toLocaleString()}
            </CommentMeta>
          </CommentItem>
        ))}
      </CommentsList>
    </CommentSectionContainer>
  );
};

export default React.memo(CommentSection);