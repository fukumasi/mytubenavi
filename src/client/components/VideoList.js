import React from "react";
import PropTypes from 'prop-types';
import styled, { keyframes } from "styled-components";
import VideoCard from "./VideoCard";
import { useTranslation } from 'react-i18next';

const VideoListContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`;

const Message = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors?.text || '#000'};
  font-size: ${({ theme }) => theme.fontSize?.medium || '16px'};
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s linear infinite;
  margin: 20px auto;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const AnimatedVideoListContainer = styled(VideoListContainer)`
  animation: ${fadeIn} 0.5s ease-in;
`;

const VideoList = React.memo(({ videos = [], isLoading, error }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingSpinner aria-label={t('loading')} />;
  }

  if (error) {
    return <Message role="alert">{t('error.occurred')}: {error}</Message>;
  }

  if (videos.length === 0) {
    return <Message>{t('noVideos')}</Message>;
  }

  return (
    <AnimatedVideoListContainer role="list" aria-label={t('videoList')}>
      {videos.map((video) => {
        const videoId = video.id?.videoId || video.id;
        return (
          <VideoCard 
            key={videoId} 
            video={{
              id: videoId,
              title: video.snippet?.title || '',
              thumbnailUrl: video.snippet?.thumbnails?.medium?.url || '',
              channelTitle: video.snippet?.channelTitle || '',
              publishedAt: video.snippet?.publishedAt || '',
              viewCount: video.statistics?.viewCount || '',
              duration: video.contentDetails?.duration || '',
            }} 
          />
        );
      })}
    </AnimatedVideoListContainer>
  );
});

VideoList.propTypes = {
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({ videoId: PropTypes.string })
      ]),
      snippet: PropTypes.shape({
        title: PropTypes.string,
        thumbnails: PropTypes.shape({
          medium: PropTypes.shape({
            url: PropTypes.string,
          }),
        }),
        channelTitle: PropTypes.string,
        publishedAt: PropTypes.string,
      }),
      statistics: PropTypes.shape({
        viewCount: PropTypes.string,
      }),
      contentDetails: PropTypes.shape({
        duration: PropTypes.string,
      }),
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
};

VideoList.displayName = 'VideoList';

export default VideoList;