import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const FeaturedVideosContainer = styled.div`
  margin-top: 20px;
`;

const VideoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const VideoCard = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
`;

const Thumbnail = styled.img`
  width: 100px;
  height: 56px;
  object-fit: cover;
  margin-right: 10px;
`;

const VideoInfo = styled.div`
  flex: 1;
`;

const FeaturedVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      try {
        const response = await fetch('/api/featured-videos');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setVideos(data);
      } catch (err) {
        console.error('Error fetching featured videos:', err);
        setError('有料掲載動画の取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedVideos();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <FeaturedVideosContainer>
      <h2>有料掲載動画</h2>
      <VideoList>
        {videos.length > 0 ? (
          videos.map(video => (
            <VideoCard key={video._id} to={`/video/${video.videoId}`}>
              <Thumbnail src={video.thumbnailUrl} alt={video.title} />
              <VideoInfo>
                <h3>{video.title}</h3>
                <p>{video.user?.channelName || video.user?.username}</p>
              </VideoInfo>
            </VideoCard>
          ))
        ) : (
          <p>表示する動画がありません。</p>
        )}
      </VideoList>
    </FeaturedVideosContainer>
  );
};

export default FeaturedVideos;