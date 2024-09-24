import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import VideoCard from './VideoCard';

const FeaturedVideosContainer = styled.div`
  margin-top: 20px;
`;

const Title = styled.h2`
  font-size: 20px;
  margin-bottom: 10px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const FeaturedVideos = () => {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const fetchFeaturedVideos = async () => {
      try {
        // ここでAPIからフィーチャーされた動画を取得
        // 仮のデータを使用
        const dummyData = [
          { id: '1', title: 'Featured Video 1', thumbnail: 'https://via.placeholder.com/200x112' },
          { id: '2', title: 'Featured Video 2', thumbnail: 'https://via.placeholder.com/200x112' },
          { id: '3', title: 'Featured Video 3', thumbnail: 'https://via.placeholder.com/200x112' },
        ];
        setVideos(dummyData);
      } catch (error) {
        setError(t('featuredVideosError'));
      }
    };

    fetchFeaturedVideos();
  }, [t]);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <FeaturedVideosContainer>
      <Title>{t('featuredVideos')}</Title>
      <VideoGrid>
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </VideoGrid>
    </FeaturedVideosContainer>
  );
};

export default FeaturedVideos;