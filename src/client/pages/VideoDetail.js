import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import styled from "styled-components";
import { formatDistance, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getVideoDetails, getRelatedVideos } from "../api/youtube";
import ErrorMessage from "../components/ErrorMessage";
import RelatedVideos from "../components/RelatedVideos";
import CommentSection from "../components/CommentSection";
import { useTheme } from "../hooks";
import SkeletonLoader from "../components/SkeletonLoader";
import { useAuth } from "../contexts/AuthContext";
import { doc, setDoc, arrayUnion, getFirestore, serverTimestamp } from "firebase/firestore";
import RatingSection from "../components/RatingSection";

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.medium};
  padding: ${({ theme }) => theme.spacing.large};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const MainContent = styled.main`
  flex: 2;
`;

const Sidebar = styled.aside`
  flex: 1;
`;

const VideoPlayer = styled.div`
  position: relative;
  padding-bottom: 56.25%;
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

const VideoInfo = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  padding: ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius};
  transition: background-color 0.3s ease;
`;

const VideoTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.large};
  margin-bottom: ${({ theme }) => theme.spacing.small};
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.small};
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
`;

const ChannelName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.medium};
  font-weight: bold;
`;

const VideoDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  white-space: pre-wrap;
`;

const VideoStats = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.small};
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const VideoDetail = () => {
  const { id } = useParams();
  const [playerReady, setPlayerReady] = useState(false);
  const theme = useTheme();
  const { user } = useAuth();
  const db = getFirestore();
  const [error, setError] = useState(null);

  const {
    data: video,
    isLoading: isLoadingVideo,
    error: videoError
  } = useQuery(["video", id], () => getVideoDetails(id), {
    retry: 3,
    onError: (error) => {
      console.error("Error fetching video details:", error);
      setError("動画詳細の取得エラー: " + error.message);
    },
    staleTime: 5 * 60 * 1000, // 5分
    onSuccess: (data) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        setDoc(userRef, {
          watchHistory: arrayUnion({
            videoId: id,
            title: data.snippet?.title,
            watchedAt: serverTimestamp()
          })
        }, { merge: true }).catch(error => {
          console.error("Error saving watch history:", error);
          setError("視聴履歴の保存エラー: " + error.message);
        });
      }
    }
  });

  const {
    data: relatedVideos,
    isLoading: isLoadingRelated,
    error: relatedError
  } = useQuery(["relatedVideos", id], () => getRelatedVideos(id), {
    enabled: !!id,
    retry: 3,
    onError: (error) => {
      console.error("Error fetching related videos:", error);
      setError("関連動画の取得エラー: " + error.message);
    },
    staleTime: 5 * 60 * 1000, // 5分
  });

  const onPlayerReady = useCallback(() => {
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
    return "不明";
  }, [video?.statistics?.viewCount]);

  const formattedPublishDate = useMemo(() => {
    if (video?.snippet?.publishedAt) {
      const date = new Date(video.snippet.publishedAt);
      if (isValid(date)) {
        return formatDistance(date, new Date(), { addSuffix: true, locale: ja });
      }
    }
    return "日付不明";
  }, [video?.snippet?.publishedAt]);

  const formattedLikeCount = useMemo(() => {
    if (video?.statistics?.likeCount) {
      return parseInt(video.statistics.likeCount).toLocaleString();
    }
    return "不明";
  }, [video?.statistics?.likeCount]);

  const formattedCommentCount = useMemo(() => {
    if (video?.statistics?.commentCount) {
      return parseInt(video.statistics.commentCount).toLocaleString();
    }
    return "不明";
  }, [video?.statistics?.commentCount]);

  if (isLoadingVideo || isLoadingRelated) return <SkeletonLoader aria-label="コンテンツを読み込み中" />;
  if (videoError || relatedError || error) return <ErrorMessage message={error || videoError?.message || relatedError?.message || "エラーが発生しました"} />;
  if (!video) return <ErrorMessage message="動画が見つかりません。" />;

  return (
    <VideoContainer theme={theme}>
      <MainContent>
        <VideoPlayer theme={theme}>
          {playerReady && (
            <VideoIframe
              src={`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1`}
              title={video.snippet?.title || "YouTube動画"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              aria-label="YouTube動画プレーヤー"
            />
          )}
        </VideoPlayer>
        <VideoInfo theme={theme}>
          <VideoTitle theme={theme}>{video.snippet?.title || "タイトルなし"}</VideoTitle>
          <VideoMeta theme={theme} aria-label="動画のメタデータ">
            <span>{`${formattedViewCount} 回視聴`}</span>
            <span>{formattedPublishDate}</span>
          </VideoMeta>
          <ChannelInfo theme={theme}>
            <ChannelThumbnail 
              src={video.snippet?.thumbnails?.default?.url || 'https://via.placeholder.com/48x48.png?text=No+Image'}
              alt={`${video.snippet?.channelTitle || "チャンネル"} のサムネイル`}
              loading="lazy"
              onError={(e) => {
                console.error('Channel thumbnail loading error:', e);
                setError('チャンネルサムネイルの読み込みエラー: ' + e.message);
                e.target.src = 'https://via.placeholder.com/48x48.png?text=No+Image';
              }}
              theme={theme}
            />
            <ChannelName theme={theme}>{video.snippet?.channelTitle || "チャンネル名不明"}</ChannelName>
          </ChannelInfo>
          <VideoDescription theme={theme} aria-label="動画の説明">
            {video.snippet?.description || "説明がありません。"}
          </VideoDescription>
          <VideoStats theme={theme}>
            <span>{`👍 ${formattedLikeCount}`}</span>
            <span>{`💬 ${formattedCommentCount}`}</span>
          </VideoStats>
        </VideoInfo>
        <RatingSection videoId={id} />
        <CommentSection videoId={id} />
      </MainContent>
      <Sidebar theme={theme}>
        <h2 id="related-videos-heading">関連動画</h2>
        {relatedError ? (
          <ErrorMessage message={`関連動画の読み込み中にエラーが発生しました: ${relatedError.message || '不明なエラー'}`} />
        ) : (
          <RelatedVideos videos={relatedVideos || []} aria-labelledby="related-videos-heading" />
        )}
      </Sidebar>
    </VideoContainer>
  );
};

export default React.memo(VideoDetail);