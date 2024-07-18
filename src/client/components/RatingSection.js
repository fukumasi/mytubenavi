import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RatingSection = ({ videoId }) => {
  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    fetchRating();
  }, [videoId]);

  const fetchRating = async () => {
    try {
      const response = await axios.get(`/api/videos/${videoId}/rating`);
      setRating(response.data.averageRating);
      setUserRating(response.data.userRating);
    } catch (error) {
      console.error('Error fetching rating:', error);
    }
  };

  const handleRating = async (newRating) => {
    try {
      await axios.post(`/api/videos/${videoId}/rating`, { rating: newRating });
      fetchRating();
    } catch (error) {
      console.error('Error posting rating:', error);
    }
  };

  return (
    <div className="rating-section">
      <h2>評価</h2>
      <p>平均評価: {rating.toFixed(1)}</p>
      <div className="user-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            onClick={() => handleRating(star)}
            style={{ cursor: 'pointer', color: star <= userRating ? 'gold' : 'gray' }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
};

export default RatingSection;