import React, { useState, useEffect } from 'react';
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

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.fontSizes.small};
`;

const VideoCard = ({ video }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent('https://picsum.photos/320/180')}`);
        if (!response.ok) {
          throw new Error('Failed to load thumbnail');
        }
        const blob = await response.blob();
        setThumbnailUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error('Error fetching thumbnail:', err);
        setError('Failed to load thumbnail');
      }
    };
    
  
    fetchThumbnail();
  }, [video.thumbnail]);
  

  return (
    <Card to={`/video/${video.id}`}>
      <ThumbnailWrapper>
        {thumbnailUrl ? (
          <Thumbnail
            src={thumbnailUrl}
            alt={`${video.title} のサムネイル`}
            loading="lazy"
          />
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <div>Loading...</div>
        )}
      </ThumbnailWrapper>
      <Content>
        <Title>{video.title}</Title>
        <ChannelName>{video.channel}</ChannelName>
      </Content>
    </Card>
  );
};

export default VideoCard;
