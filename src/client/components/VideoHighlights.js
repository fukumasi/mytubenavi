import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const HighlightsContainer = styled.div`
  margin-top: 40px;
`;

const VideoList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const VideoCard = styled(Link)`
  background-color: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
`;

const VideoInfo = styled.div`
  padding: 10px;
`;

const VideoTitle = styled.h4`
  margin: 0 0 5px 0;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChannelName = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #666;
`;

const ViewCount = styled.span`
  font-size: 0.8rem;
  color: #888;
`;

const VideoHighlights = ({ videos }) => {
  return (
    <HighlightsContainer>
      <h2>Popular Videos</h2>
      <VideoList>
        {videos.map(video => (
          <VideoCard key={video._id} to={`/video/${video._id}`}>
            <VideoThumbnail src={video.thumbnail} alt={video.title} />
            <VideoInfo>
              <VideoTitle title={video.title}>{video.title}</VideoTitle>
              <ChannelName>{video.channelName}</ChannelName>
              <ViewCount>{video.viewCount.toLocaleString()} views</ViewCount>
            </VideoInfo>
          </VideoCard>
        ))}
      </VideoList>
    </HighlightsContainer>
  );
};

export default VideoHighlights;