// src\client\components\RatingSection.js
import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import ErrorMessage from "./ErrorMessage";

const RatingSectionContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: 8px;
`;

const RatingTitle = styled.h2`
  font-size: 1.2em;
  margin-bottom: 10px;
`;

const AverageRating = styled.p`
  font-size: 1em;
  margin-bottom: 15px;
`;

const UserRating = styled.div`
  display: flex;
  align-items: center;
`;

const Star = styled.span`
  font-size: 1.5em;
  cursor: pointer;
  color: ${({ active, theme }) => active ? theme.colors.accent1 : theme.colors.textSecondary};
  transition: color 0.2s ease-in-out;

  &:hover {
    color: ${({ theme }) => theme.colors.accent1};
  }
`;

const LoginPrompt = styled.p`
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const RatingSection = ({ videoId }) => {
  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [error, setError] = useState(null);
  const db = getFirestore();
  const { user } = useAuth();

  useEffect(() => {
    fetchRating();
  }, [videoId, user]);

  const fetchRating = async () => {
    try {
      const videoRef = doc(db, "videos", videoId);
      const videoDoc = await getDoc(videoRef);
      if (videoDoc.exists()) {
        const videoData = videoDoc.data();
        setRating(videoData.averageRating || 0);
        if (user) {
          const userRatings = videoData.userRatings || {};
          setUserRating(userRatings[user.uid] || 0);
        }
      }
    } catch (error) {
      setError("評価の取得中にエラーが発生しました。");
      console.error("Error fetching rating:", error);
    }
  };

  const handleRating = async (newRating) => {
    if (!user) {
      setError("評価するにはログインが必要です。");
      return;
    }

    try {
      const videoRef = doc(db, "videos", videoId);
      const videoDoc = await getDoc(videoRef);
      if (videoDoc.exists()) {
        const videoData = videoDoc.data();
        const userRatings = videoData.userRatings || {};
        const oldRating = userRatings[user.uid] || 0;
        userRatings[user.uid] = newRating;

        // Calculate new average rating
        const totalRatings = Object.values(userRatings).reduce((a, b) => a + b, 0);
        const newAverageRating = totalRatings / Object.keys(userRatings).length;

        await updateDoc(videoRef, {
          userRatings: userRatings,
          averageRating: newAverageRating,
          [`ratingCounts.${newRating}`]: arrayUnion(user.uid),
          ...(oldRating && { [`ratingCounts.${oldRating}`]: arrayRemove(user.uid) })
        });

        setRating(newAverageRating);
        setUserRating(newRating);
        setError(null);
      }
    } catch (error) {
      setError("評価の投稿中にエラーが発生しました。");
      console.error("Error posting rating:", error);
    }
  };

  return (
    <RatingSectionContainer>
      <RatingTitle>評価</RatingTitle>
      <AverageRating>平均評価: {rating.toFixed(1)}</AverageRating>
      {error && <ErrorMessage message={error} />}
      {user ? (
        <UserRating>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              onClick={() => handleRating(star)}
              active={star <= userRating}
            >
              ★
            </Star>
          ))}
        </UserRating>
      ) : (
        <LoginPrompt>評価するにはログインしてください。</LoginPrompt>
      )}
    </RatingSectionContainer>
  );
};

export default RatingSection;