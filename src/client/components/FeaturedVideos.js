import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getFeaturedVideos } from '../api/youtube';

const FeaturedVideosContainer = styled.div`
  margin-bottom: 20px;
`;

const VideoItem = styled.div`
  margin-bottom: 10px;
`;

const Thumbnail = styled.img`
  width: 100%;
  height: auto;
  object-fit: cover;
`;

const Title = styled.h4`
  font-size: 14px;
  margin: 5px 0;
`;

const FeaturedVideos = () => {
  const { data: videos, isLoading, error } = useQuery('featuredVideos', getFeaturedVideos);

  if (isLoading) return <p>有料掲載動画を読み込み中...</p>;
  if (error) return <p>有料掲載動画の読み込みに失敗しました。</p>;
  if (!videos || videos.length === 0) return <p>現在、有料掲載動画はありません。</p>;

  return (
    <FeaturedVideosContainer>
      {videos.map((video) => (
        <VideoItem key={video.id}>
          <Link to={`/video/${video.id}`}>
            <Thumbnail src={video.thumbnail} alt={video.title} />
            <Title>{video.title}</Title>
          </Link>
        </VideoItem>
      ))}
    </FeaturedVideosContainer>
  );
};

export default FeaturedVideos;