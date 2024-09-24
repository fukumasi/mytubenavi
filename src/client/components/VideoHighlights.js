import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const HighlightsContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.large};
`;

const VideoList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.medium};
`;

const VideoCard = styled(Link)`
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px ${({ theme }) => theme.colors.shadow};
  }
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
`;

const VideoInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.small};
`;

const VideoTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.xsmall} 0;
  font-size: ${({ theme }) => theme.fontSize.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChannelName = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSize.small};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ViewCount = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xsmall};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const VideoHighlights = ({ videos }) => {
  return (
    <HighlightsContainer>
      <h2>人気の動画</h2>
      <VideoList>
        {videos.map((video) => (
          <VideoCard key={video.id} to={`/video/${video.id}`}>
            <VideoThumbnail src={video.thumbnail} alt={video.title} />
            <VideoInfo>
              <VideoTitle>{video.title}</VideoTitle>
              <ChannelName>{video.channelName}</ChannelName>
              <ViewCount>{video.viewCount.toLocaleString()} 回視聴</ViewCount>
            </VideoInfo>
          </VideoCard>
        ))}
      </VideoList>
    </HighlightsContainer>
  );
};

export default VideoHighlights;