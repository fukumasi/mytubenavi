import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const RelatedVideosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RelatedVideoItem = styled(Link)`
  display: flex;
  gap: 10px;
  text-decoration: none;
  color: inherit;
`;

const Thumbnail = styled.img`
  width: 120px;
  height: 67px;
  object-fit: cover;
`;

const VideoInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const RelatedVideos = ({ videoId }) => {
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRelatedVideos = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/videos/${videoId}/related`);
        setRelatedVideos(response.data);
      } catch (err) {
        setError('関連動画の取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedVideos();
  }, [videoId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <RelatedVideosList>
      {relatedVideos.map(video => (
        <RelatedVideoItem key={video._id} to={`/video/${video._id}`}>
          <Thumbnail src={video.thumbnail} alt={video.title} />
          <VideoInfo>
            <h3>{video.title}</h3>
            <p>{video.channelName}</p>
            <p>{video.viewCount.toLocaleString()} views</p>
          </VideoInfo>
        </RelatedVideoItem>
      ))}
    </RelatedVideosList>
  );
};

export default RelatedVideos;