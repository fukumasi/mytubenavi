import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-5px);
  }
`;

const ThumbnailWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 アスペクト比 */
`;

const Thumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing.small};
`;

const Title = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.small};
  font-size: ${({ theme }) => theme.fontSizes.medium};
`;

const ChannelName = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const VideoCard = ({ video }) => {
  return (
    <Card to={`/video/${video.id}`}>
      <ThumbnailWrapper>
        <Thumbnail
          src={video.thumbnail}
          alt={`${video.title} のサムネイル`}
          loading="lazy"
        />
      </ThumbnailWrapper>
      <Content>
        <Title>{video.title}</Title>
        <ChannelName>{video.channel}</ChannelName>
      </Content>
    </Card>
  );
};

export default VideoCard;