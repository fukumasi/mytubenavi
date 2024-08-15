import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import styled from "styled-components";
import { getVideoDetails, getRelatedVideos } from "../api/youtube";
import ErrorMessage from "../components/ErrorMessage";
import RelatedVideos from "../components/RelatedVideos";
import { useTheme } from "../hooks";
import SkeletonLoader from "../components/SkeletonLoader";

const VideoContainer = styled.main`
  max-width: ${({ theme }) => theme.maxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.large};
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${({ theme }) => theme.spacing.medium};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.article``;

const VideoPlayer = styled.div`
  position: relative;
  padding-bottom: 56.25%; /* 16:9 アスペクト比 */
  height: 0;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const VideoIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
`;

const VideoInfo = styled.section`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  padding: ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const VideoTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.large};
  margin-bottom: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.text};
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const VideoDescription = styled.p`
  white-space: pre-wrap;
  font-size: ${({ theme }) => theme.fontSizes.medium};
  color: ${({ theme }) => theme.colors.text};
`;

const ChannelInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const ChannelThumbnail = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: ${({ theme }) => theme.spacing.small};
  background-color: ${({ theme }) => theme.colors.backgroundLight};
`;

const ChannelName = styled.span`
  font-weight: bold;
  font-size: ${({ theme }) => theme.fontSizes.medium};
  color: ${({ theme }) => theme.colors.text};
`;

const Sidebar = styled.aside``;

const VideoDetail = () => {
  const { id } = useParams();
  const [playerReady, setPlayerReady] = useState(false);
  const theme = useTheme();

  const {
    data: video,
    isLoading: isLoadingVideo,
    error: videoError
  } = useQuery(["video", id], () => getVideoDetails(id), {
    retry: 3,
    onError: (error) => console.error("Video details fetching error:", error)
  });

  const {
    data: relatedVideos,
    isLoading: isLoadingRelated,
    error: relatedError
  } = useQuery(["relatedVideos", id], () => getRelatedVideos(id), {
    enabled: !!id,
    retry: 3,
    onError: (error) => console.error("Related videos fetching error:", error)
  });

  const onPlayerReady = useCallback(() => {
    console.log("Player is ready");
    setPlayerReady(true);
  }, []);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = onPlayerReady;
    } else {
      setPlayerReady(true);
    }

    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, [onPlayerReady]);

  const formattedViewCount = useMemo(() => {
    if (video?.statistics?.viewCount) {
      return parseInt(video.statistics.viewCount).toLocaleString();
    }
    return "N/A";
  }, [video?.statistics?.viewCount]);

  const formattedPublishDate = useMemo(() => {
    if (video?.snippet?.publishedAt) {
      return new Date(video.snippet.publishedAt).toLocaleDateString();
    }
    return "N/A";
  }, [video?.snippet?.publishedAt]);

  if (isLoadingVideo || isLoadingRelated) return <SkeletonLoader />;
  if (videoError) return <ErrorMessage message={`動画の読み込み中にエラーが発生しました: ${videoError.message || '不明なエラー'}`} />;
  if (!video) return <ErrorMessage message="動画が見つかりません。" />;

  return (
    <VideoContainer theme={theme}>
      <MainContent>
        <VideoPlayer theme={theme}>
          {playerReady && (
            <VideoIframe
              src={`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1`}
              title={video.snippet?.title || "YouTube video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              aria-label="YouTube video player"
            />
          )}
        </VideoPlayer>
        <VideoInfo theme={theme}>
          <VideoTitle theme={theme}>{video.snippet?.title || "タイトルなし"}</VideoTitle>
          <VideoMeta theme={theme} aria-label="Video metadata">
            <span>{`${formattedViewCount} 回視聴`}</span>
            <span>{formattedPublishDate}</span>
          </VideoMeta>
          <ChannelInfo theme={theme}>
            <ChannelThumbnail 
              src={video.snippet?.thumbnails?.default?.url}
              alt={`${video.snippet?.channelTitle || "Channel"} thumbnail`}
              loading="lazy"
              onError={(e) => {
                console.error('Error loading channel thumbnail:', e);
                e.target.style.display = 'none';
              }}
              theme={theme}
            />
            <ChannelName theme={theme}>{video.snippet?.channelTitle || "チャンネル名不明"}</ChannelName>
          </ChannelInfo>
          <VideoDescription theme={theme} aria-label="Video description">
            {video.snippet?.description || "説明がありません。"}
          </VideoDescription>
        </VideoInfo>
      </MainContent>
      <Sidebar theme={theme}>
        <h2 id="related-videos-heading" className="sr-only">関連動画</h2>
        {relatedError ? (
          <ErrorMessage message={`関連動画の読み込み中にエラーが発生しました: ${relatedError.message || '不明なエラー'}`} />
        ) : (
          <RelatedVideos videos={relatedVideos || []} aria-labelledby="related-videos-heading" />
        )}
      </Sidebar>
    </VideoContainer>
  );
};

export default VideoDetail;