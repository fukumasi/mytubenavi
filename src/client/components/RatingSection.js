// src\client\components\RatingSection.js
import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const RatingSection = ({ videoId }) => {
  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    fetchRating();
  }, [videoId]);

  const fetchRating = async () => {
    try {
      const videoRef = doc(db, "videos", videoId);
      const videoDoc = await getDoc(videoRef);
      if (videoDoc.exists()) {
        const videoData = videoDoc.data();
        setRating(videoData.averageRating || 0);
        if (auth.currentUser) {
          const userRatings = videoData.userRatings || {};
          setUserRating(userRatings[auth.currentUser.uid] || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching rating:", error);
    }
  };

  const handleRating = async (newRating) => {
    if (!auth.currentUser) {
      console.error("User must be logged in to rate");
      return;
    }

    try {
      const videoRef = doc(db, "videos", videoId);
      const videoDoc = await getDoc(videoRef);
      if (videoDoc.exists()) {
        const videoData = videoDoc.data();
        const userRatings = videoData.userRatings || {};
        const oldRating = userRatings[auth.currentUser.uid] || 0;
        userRatings[auth.currentUser.uid] = newRating;

        // Calculate new average rating
        const totalRatings = Object.values(userRatings).reduce((a, b) => a + b, 0);
        const newAverageRating = totalRatings / Object.keys(userRatings).length;

        await updateDoc(videoRef, {
          userRatings: userRatings,
          averageRating: newAverageRating,
          [`ratingCounts.${newRating}`]: arrayUnion(auth.currentUser.uid),
          ...(oldRating && { [`ratingCounts.${oldRating}`]: arrayRemove(auth.currentUser.uid) })
        });

        setRating(newAverageRating);
        setUserRating(newRating);
      }
    } catch (error) {
      console.error("Error posting rating:", error);
    }
  };

  return (
    <div className="rating-section">
      <h2>評価</h2>
      <p>平均評価: {rating.toFixed(1)}</p>
      <div className="user-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => handleRating(star)}
            style={{
              cursor: "pointer",
              color: star <= userRating ? "gold" : "gray",
            }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
};

export default RatingSection;