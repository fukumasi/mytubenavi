import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding: 20px;
`;

const VideoCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
`;

const VideoInfo = styled.div`
  padding: 10px;
`;

const VideoTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #333;
`;

const ViewCount = styled.p`
  margin: 5px 0 0;
  font-size: 14px;
  color: #666;
`;

const PopularVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPopularVideos = async () => {
      try {
        const response = await axios.get("/api/videos/popular");
        setVideos(response.data);
        setLoading(false);
      } catch (err) {
        setError("人気動画の取得に失敗しました。");
        setLoading(false);
      }
    };

    fetchPopularVideos();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <VideoGrid>
      {videos.map((video) => (
        <VideoCard key={video._id}>
          <VideoThumbnail
            src={video.thumbnail || "placeholder.jpg"}
            alt={video.title}
          />
          <VideoInfo>
            <VideoTitle>{video.title}</VideoTitle>
            <ViewCount>{video.viewCount.toLocaleString()} views</ViewCount>
          </VideoInfo>
        </VideoCard>
      ))}
    </VideoGrid>
  );
};

export default PopularVideos;
