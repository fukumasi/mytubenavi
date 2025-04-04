import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks';
import { useInView } from 'react-intersection-observer';

const RelatedVideosList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing?.small || '10px'};
  list-style-type: none;
  padding: 0;
`;

const VideoItemWrapper = styled.li`
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors?.primary || '#1a73e8'};
  }
`;

const VideoLink = styled(Link)`
  display: flex;
  text-decoration: none;
  color: inherit;
  padding: ${({ theme }) => theme.spacing?.xsmall || '5px'};
  border-radius: ${({ theme }) => theme.borderRadius || '4px'};

  &:focus {
    outline: none;
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors?.backgroundHover || '#f0f0f0'};
  }
`;

const Thumbnail = styled.img`
  width: 120px;
  height: 67px;
  object-fit: cover;
  margin-right: ${({ theme }) => theme.spacing?.small || '10px'};
`;

const VideoInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSize?.small || '14px'};
  margin: 0 0 5px 0;
`;

const ChannelName = styled.span`
  font-size: ${({ theme }) => theme.fontSize?.xsmall || '12px'};
  color: ${({ theme }) => theme.colors?.textSecondary || '#666'};
`;

const RelatedVideoItem = React.memo(({ video, theme, handleKeyDown }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });

  const videoId = video.id.videoId || video.id;

  return (
    <VideoItemWrapper ref={ref} theme={theme}>
      <VideoLink
        to={`/video/${videoId}`}
        onKeyDown={(e) => handleKeyDown(e, videoId)}
        theme={theme}
      >
        {inView && (
          <Thumbnail
            src={video.snippet.thumbnails.medium.url}
            alt={`${video.snippet.title} のサムネイル`}
            loading="lazy"
            theme={theme}
          />
        )}
        <VideoInfo>
          <Title theme={theme}>{video.snippet.title}</Title>
          <ChannelName theme={theme}>{video.snippet.channelTitle}</ChannelName>
        </VideoInfo>
      </VideoLink>
    </VideoItemWrapper>
  );
});

const RelatedVideos = ({ videos }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleKeyDown = useCallback((event, videoId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      navigate(`/video/${videoId}`);
    }
  }, [navigate]);

  const memoizedVideos = useMemo(() => 
    videos.map((video) => (
      <RelatedVideoItem 
        key={video.id.videoId || video.id}
        video={video}
        theme={theme}
        handleKeyDown={handleKeyDown}
      />
    )),
    [videos, theme, handleKeyDown]
  );

  return (
    <RelatedVideosList theme={theme} aria-label="関連動画">
      {memoizedVideos}
    </RelatedVideosList>
  );
};

export default React.memo(RelatedVideos);