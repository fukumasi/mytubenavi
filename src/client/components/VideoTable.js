import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import { FixedSizeList as List } from 'react-window';

const MESSAGES = {
  NO_VIDEOS: '動画が見つかりません',
  THUMBNAIL: 'サムネイル',
  TITLE: 'タイトル',
  CHANNEL: 'チャンネル',
  VIEW_COUNT: '再生回数',
  PUBLISHED_AT: '投稿日',
  DURATION: '長さ',
  CATEGORY: 'カテゴリー',
  UNKNOWN: '不明',
  NO_TITLE: 'タイトルなし',
  ERROR_LOADING: '動画の読み込み中にエラーが発生しました'
};

const TableContainer = styled.div.attrs({ 
  role: 'table', 
  'aria-label': '動画一覧テーブル' 
})`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.mainColumnMinWidth};
  margin: 0 auto;
`;

const TableHeader = styled.div.attrs({ role: 'row' })`
  display: flex;
  background-color: ${({ theme }) => theme.colors?.backgroundLight || '#f8f9fa'};
  font-weight: bold;
  border-bottom: 1px solid ${({ theme }) => theme.colors?.border || '#dee2e6'};
`;

const HeaderCell = styled.div.attrs({ role: 'columnheader' })`
  flex: ${props => props.$flex || 1};
  padding: ${({ theme }) => theme.spacing?.small || '10px'};
  font-size: ${({ theme }) => theme.fontSizes?.small || '14px'};
`;

const Row = styled.div.attrs({ role: 'row' })`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors?.border || '#dee2e6'};
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background-color: ${({ theme }) => theme.colors?.backgroundHover || '#e9ecef'};
  }
`;

const Cell = styled.div.attrs({ role: 'cell' })`
  flex: ${props => props.$flex || 1};
  padding: ${({ theme }) => theme.spacing?.small || '10px'};
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.fontSizes?.small || '14px'};
`;

const ThumbnailImage = styled.img`
  width: 120px;
  height: 67px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.borderRadius?.small || '4px'};
`;

const NoVideosMessage = styled.p`
  text-align: center;
  padding: ${({ theme }) => theme.spacing?.large || '20px'};
  font-style: italic;
  color: ${({ theme }) => theme.colors?.textLight || '#6c757d'};
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.colors?.primary || '#007bff'};
  text-decoration: none;
  &:hover, &:focus {
    text-decoration: underline;
    outline: 2px solid ${({ theme }) => theme.colors?.primary || '#007bff'};
    outline-offset: 2px;
  }
`;

const VideoTable = React.memo(({ videos }) => {
  if (!videos || videos.length === 0) {
    return <NoVideosMessage>{MESSAGES.NO_VIDEOS}</NoVideosMessage>;
  }

  const defaultThumbnail = 'https://via.placeholder.com/120x67.png?text=No+Image';

  const formatDuration = useCallback((duration) => {
    if (!duration) return MESSAGES.UNKNOWN;
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return MESSAGES.UNKNOWN;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
  }, []);

  const RowRenderer = useCallback(({ index, style }) => {
    const video = videos[index];
    if (!video) {
      return <Row style={style}><Cell>{MESSAGES.ERROR_LOADING}</Cell></Row>;
    }

    const thumbnailUrl = video.thumbnailUrl || 
                         video.thumbnails?.medium?.url || 
                         video.thumbnails?.default?.url || 
                         video.snippet?.thumbnails?.medium?.url ||
                         video.snippet?.thumbnails?.default?.url ||
                         defaultThumbnail;
    
    // プロキシを使用してサムネイル画像を取得
    const proxyThumbnailUrl = `/api/image-proxy?url=${encodeURIComponent(thumbnailUrl)}`;
    
    const title = video.title || video.snippet?.title || MESSAGES.NO_TITLE;
    const channelTitle = video.channelTitle || video.snippet?.channelTitle || MESSAGES.UNKNOWN;
    const viewCount = (video.statistics?.viewCount || video.viewCount || 0).toLocaleString();
    const publishedAt = new Date(video.publishedAt || video.snippet?.publishedAt || Date.now()).toLocaleDateString();
    const duration = formatDuration(video.contentDetails?.duration || video.duration);
    const category = video.category || MESSAGES.UNKNOWN;

    const uniqueKey = video.id || video.videoId || `video-${video.etag}`;

    return (
      <Row key={uniqueKey} style={style}>
        <Cell $flex={2}>
          <StyledLink to={`/video/${video.id || video.videoId}`} aria-label={`${title}のサムネイル`}>
            <ThumbnailImage src={proxyThumbnailUrl} alt="" />
          </StyledLink>
        </Cell>
        <Cell $flex={4}>
          <StyledLink to={`/video/${video.id || video.videoId}`}>{title}</StyledLink>
        </Cell>
        <Cell $flex={2} aria-label={`チャンネル: ${channelTitle}`}>{channelTitle}</Cell>
        <Cell $flex={1} aria-label={`再生回数: ${viewCount}`}>{viewCount}</Cell>
        <Cell $flex={1} aria-label={`投稿日: ${publishedAt}`}>{publishedAt}</Cell>
        <Cell $flex={1} aria-label={`動画の長さ: ${duration}`}>{duration}</Cell>
        <Cell $flex={1} aria-label={`カテゴリー: ${category}`}>{category}</Cell>
      </Row>
    );
  }, [videos, formatDuration]);

  const memoizedRowRenderer = useMemo(() => RowRenderer, [RowRenderer]);

  return (
    <ErrorBoundary>
      <TableContainer>
        <TableHeader>
          <HeaderCell $flex={2}>{MESSAGES.THUMBNAIL}</HeaderCell>
          <HeaderCell $flex={4}>{MESSAGES.TITLE}</HeaderCell>
          <HeaderCell $flex={2}>{MESSAGES.CHANNEL}</HeaderCell>
          <HeaderCell $flex={1}>{MESSAGES.VIEW_COUNT}</HeaderCell>
          <HeaderCell $flex={1}>{MESSAGES.PUBLISHED_AT}</HeaderCell>
          <HeaderCell $flex={1}>{MESSAGES.DURATION}</HeaderCell>
          <HeaderCell $flex={1}>{MESSAGES.CATEGORY}</HeaderCell>
        </TableHeader>
        <List
          height={600}
          itemCount={videos.length}
          itemSize={100}
          width="100%"
        >
          {memoizedRowRenderer}
        </List>
      </TableContainer>
    </ErrorBoundary>
  );
});

export default VideoTable;