import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const CardContainer = styled(Link)`
  display: flex;
  margin-bottom: 20px;
  text-decoration: none;
  color: inherit;
`;

const Thumbnail = styled.img`
  width: 320px;
  height: 180px;
  object-fit: cover;
  margin-right: 10px;
`;

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  margin: 0 0 5px 0;
  font-size: 16px;
`;

const ChannelName = styled.p`
  margin: 0;
  font-size: 14px;
  color: #606060;
`;

const VideoStats = styled.p`
  margin: 5px 0 0 0;
  font-size: 12px;
  color: #606060;
`;

const VideoCard = ({ video }) => {
  if (!video) {
    return null;
  }

  const thumbnailUrl = video.thumbnails?.medium?.url || '/path/to/default/thumbnail.jpg';

  return (
    <CardContainer to={`/video/${video.videoId}`}>
      <Thumbnail 
        src={thumbnailUrl} 
        alt={video.title} 
      />
      <InfoContainer>
        <Title>{video.title}</Title>
        <ChannelName>{video.user?.channelName || 'Unknown Channel'}</ChannelName>
        <VideoStats>
          {video.views?.toLocaleString()} 回視聴 • 評価: {video.rating} • 
          アップロード日: {video.uploadDate}
        </VideoStats>
      </InfoContainer>
    </CardContainer>
  );
};

export default VideoCard;