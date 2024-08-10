import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const VideoContainer = styled.div`
  max-width: ${({ theme }) => theme.maxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.large};
`;

const VideoPlayer = styled.div`
  position: relative;
  padding-bottom: 56.25%; /* 16:9 アスペクト比 */
  height: 0;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const VideoIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
`;

const VideoInfo = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const VideoTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSize.large};
  margin-bottom: ${({ theme }) => theme.spacing.small};
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  font-size: ${({ theme }) => theme.fontSize.small};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const VideoDescription = styled.p`
  white-space: pre-wrap;
  font-size: ${({ theme }) => theme.fontSize.medium};
`;

const fetchVideo = async (id) => {
  const response = await axios.get(`/api/videos/${id}`);
  return response.data;
};

const VideoDetail = () => {
  const { id } = useParams();
  const { data: video, isLoading, error } = useQuery(['video', id], () => fetchVideo(id), {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="動画の読み込み中にエラーが発生しました。" />;
  if (!video) return <ErrorMessage message="動画が見つかりません。" />;

  return (
    <VideoContainer>
      <VideoPlayer>
        <VideoIframe
          src={`https://www.youtube.com/embed/${id}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </VideoPlayer>
      <VideoInfo>
        <VideoTitle>{video.title}</VideoTitle>
        <VideoMeta>
          <span>{video.views ? `${video.views.toLocaleString()} 回視聴` : 'N/A 回視聴'}</span>
          <span>{video.uploadDate || 'N/A'}</span>
        </VideoMeta>
        <VideoDescription>{video.description || '説明がありません。'}</VideoDescription>
      </VideoInfo>
    </VideoContainer>
  );
};

export default VideoDetail;