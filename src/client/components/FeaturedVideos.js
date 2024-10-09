import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import VideoCard from './VideoCard';

const FeaturedVideosContainer = styled.div`
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

const FeaturedVideos = () => {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      try {
        setIsLoading(true);
        // ここでAPIからフィーチャーされた動画を取得
        // 仮のデータを使用
        const dummyData = [
          { id: '1', title: 'Featured Video 1', thumbnailUrl: 'https://via.placeholder.com/200x112' },
          { id: '2', title: 'Featured Video 2', thumbnailUrl: 'https://via.placeholder.com/200x112' },
          { id: '3', title: 'Featured Video 3', thumbnailUrl: 'https://via.placeholder.com/200x112' },
        ];
        setVideos(dummyData);
      } catch (error) {
        console.error('Error fetching featured videos:', error);
        setError(t('error.occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedVideos();
  }, [t]);

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
    <FeaturedVideosContainer>
      <Title>{t('featuredVideos')}</Title>
      <VideoGrid>
        {videos.map((video) => (
          <VideoCard 
            key={video.id} 
            video={{
              id: video.id,
              snippet: {
                title: video.title,
                thumbnails: {
                  medium: {
                    url: video.thumbnailUrl
                  }
                }
              }
            }} 
          />
        ))}
      </VideoGrid>
    </FeaturedVideosContainer>
  );
};

export default FeaturedVideos;