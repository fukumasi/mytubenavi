import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import styled from 'styled-components';
import RelatedVideos from './RelatedVideos';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

// ... 既存の styled components ...

const InteractionButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
`;

const LikeButton = styled(Button)`
  background-color: #4CAF50;
  color: white;
`;

const ShareButton = styled(Button)`
  background-color: #2196F3;
  color: white;
`;

const fetchVideo = async (id) => {
  const response = await axios.get(`/api/videos/${id}`);
  if (response.status === 404) {
    throw new Error('動画が見つかりません。');
  }
  return response.data;
};

const VideoDetail = () => {
  const { id } = useParams();
  const { data: video, isLoading, error } = useQuery(['video', id], () => fetchVideo(id), {
    retry: 1,
    retryDelay: 1000,
  });

  const handleLike = () => {
    // いいね機能の実装（APIコールなど）
    console.log('Video liked');
  };

  const handleShare = () => {
    // 共有機能の実装
    console.log('Video shared');
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error instanceof Error ? error.message : '動画の取得中にエラーが発生しました。'} />;
  if (!video) return null;

  return (
    <VideoContainer>
      <MainContent>
        <VideoPlayer>
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            aria-label={`${video.title} の動画プレイヤー`}
          ></iframe>
        </VideoPlayer>
        <VideoInfo>
          <h1>{video.title}</h1>
          <p>{video.channelTitle}</p>
          <p>{video.viewCount.toLocaleString()} views</p>
          <InteractionButtons>
            <LikeButton onClick={handleLike} aria-label="この動画にいいねする">いいね</LikeButton>
            <ShareButton onClick={handleShare} aria-label="この動画を共有する">共有</ShareButton>
          </InteractionButtons>
          <p>{video.description}</p>
        </VideoInfo>
      </MainContent>
      <Sidebar>
        <RelatedVideos videoId={id} />
      </Sidebar>
    </VideoContainer>
  );
};

export default VideoDetail;