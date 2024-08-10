import React from 'react';
import styled from 'styled-components';
import VideoCard from './VideoCard';

const VideoListContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`;

const VideoList = ({ videos = [] }) => {
  if (videos.length === 0) {
    return <p>動画がありません。</p>;
  }

  return (
    <VideoListContainer>
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </VideoListContainer>
  );
};

export default VideoList;