import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const VideoContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const VideoPlayer = styled.div`
  position: relative;
  padding-bottom: 56.25%; /* 16:9 アスペクト比 */
  height: 0;
  overflow: hidden;
  margin-bottom: 20px;
`;

const VideoIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const VideoInfo = styled.div`
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
`;

const VideoTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 10px;
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const VideoDescription = styled.p`
  white-space: pre-wrap;
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
  if (!video) return <ErrorMessage message="動画データが見つかりません。" />;

  return (
    <VideoContainer>
      <VideoPlayer>
        <VideoIframe
          src={`https://www.youtube.com/embed/${video.videoId}`}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </VideoPlayer>
      <VideoInfo>
        <VideoTitle>{video.title}</VideoTitle>
        <VideoMeta>
          <span>{video.views ? video.views.toLocaleString() : 'N/A'} 回視聴</span>
          <span>{video.uploadDate || 'N/A'}</span>
        </VideoMeta>
        <VideoDescription>{video.description || '説明がありません。'}</VideoDescription>
      </VideoInfo>
    </VideoContainer>
  );
};

export default VideoDetail;