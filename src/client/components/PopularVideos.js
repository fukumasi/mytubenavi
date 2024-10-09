import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import VideoCard from './VideoCard';

const PopularVideosContainer = styled.div`
  margin-top: 20px;
`;

const Title = styled.h2`
  font-size: 24px;
  margin-bottom: 20px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  text-align: center;
  margin-top: 20px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  margin-top: 20px;
`;

const PopularVideos = () => {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const fetchPopularVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      // ここでAPIから人気の動画を取得
      // 仮のデータを使用
      const dummyData = [
        { id: '1', title: 'Popular Video 1', thumbnailUrl: 'https://via.placeholder.com/200x112', channelTitle: 'Channel 1', publishedAt: '2023-01-01', viewCount: '1000000', duration: 'PT15M33S' },
        { id: '2', title: 'Popular Video 2', thumbnailUrl: 'https://via.placeholder.com/200x112', channelTitle: 'Channel 2', publishedAt: '2023-02-01', viewCount: '500000', duration: 'PT8M22S' },
        { id: '3', title: 'Popular Video 3', thumbnailUrl: 'https://via.placeholder.com/200x112', channelTitle: 'Channel 3', publishedAt: '2023-03-01', viewCount: '750000', duration: 'PT12M45S' },
      ];
      setVideos(dummyData);
    } catch (error) {
      console.error('Error fetching popular videos:', error);
      setError(t('error.occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPopularVideos();
  }, [fetchPopularVideos]);

  if (isLoading) {
    return <LoadingMessage>{t('loading.message')}</LoadingMessage>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (videos.length === 0) {
    return <ErrorMessage>{t('noVideos')}</ErrorMessage>;
  }

  return (
    <PopularVideosContainer>
      <Title>{t('popularVideos')}</Title>
      <VideoGrid>
        {videos.map((video) => (
          <VideoCard 
            key={video.id} 
            video={video}
          />
        ))}
      </VideoGrid>
    </PopularVideosContainer>
  );
};

export default PopularVideos;