import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import VideoCard from './VideoCard';

const PopularVideosContainer = styled.div`
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

const PopularVideos = () => {
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const fetchPopularVideos = async () => {
      try {
        // ここでAPIから人気の動画を取得
        // 仮のデータを使用
        const dummyData = [
          { id: '1', title: 'Popular Video 1', thumbnail: 'https://via.placeholder.com/200x112' },
          { id: '2', title: 'Popular Video 2', thumbnail: 'https://via.placeholder.com/200x112' },
          { id: '3', title: 'Popular Video 3', thumbnail: 'https://via.placeholder.com/200x112' },
        ];
        setVideos(dummyData);
      } catch (error) {
        setError(t('popularVideosError'));
      }
    };

    fetchPopularVideos();
  }, [t]);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <PopularVideosContainer>
      <Title>{t('popularVideos')}</Title>
      <VideoGrid>
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </VideoGrid>
    </PopularVideosContainer>
  );
};

export default PopularVideos;