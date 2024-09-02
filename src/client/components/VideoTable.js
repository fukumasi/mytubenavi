import React, { useEffect, useCallback } from 'react';
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
  NO_TITLE: 'タイトルなし'
};

const TableContainer = styled.div.attrs({ 
  role: 'table', 
  'aria-label': '動画一覧テーブル' 
})`
  width: 100%;
`;

const TableHeader = styled.div.attrs({ role: 'row' })`
  display: flex;
  background-color: ${({ theme }) => theme.colors?.backgroundLight || '#f8f9fa'};
  font-weight: bold;
  border-bottom: 1px solid ${({ theme }) => theme.colors?.border || '#dee2e6'};
`;

const HeaderCell = styled.div.attrs({ role: 'columnheader' })`
  flex: ${props => props.$flex || 1};
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors?.backgroundHover || '#e9ecef'};
  }
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
  padding: 10px;
  display: flex;
  align-items: center;
`;

const ThumbnailImage = styled.img`
  width: 120px;
  height: 67px;
  object-fit: cover;
  border-radius: 4px;
`;

const NoVideosMessage = styled.p`
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: ${({ theme }) => theme.colors?.textLight || '#6c757d'};
`;

const SortIndicator = styled.span`
  margin-left: 5px;
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.colors?.primary || '#007bff'};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const getSortIndicator = (columnName, sortConfig) => {
  if (sortConfig.key === columnName) {
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  }
  return '';
};

const performanceTest = (videoCount) => {
  console.time('Generate Test Data');
  const testVideos = Array(videoCount).fill().map((_, index) => ({
    id: `test-${index}`,
    title: `Test Video ${index}`,
    channelTitle: `Test Channel ${index}`,
    thumbnails: { medium: { url: 'https://via.placeholder.com/120x67' } },
    statistics: { viewCount: Math.floor(Math.random() * 1000000).toString() },
    publishedAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    contentDetails: { duration: `PT${Math.floor(Math.random() * 120)}M${Math.floor(Math.random() * 60)}S` },
    category: ['音楽', 'スポーツ', 'ゲーム', '教育', 'エンターテイメント', 'ニュース', 'その他'][Math.floor(Math.random() * 7)]
  }));
  console.timeEnd('Generate Test Data');
  return testVideos;
};

const VideoTable = React.memo(({ videos, onSort, sortConfig }) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const testVideos = performanceTest(1000);
      console.log('Test videos generated:', testVideos.length);
    }
  }, []);

  if (!videos || videos.length === 0) {
    return <NoVideosMessage>{MESSAGES.NO_VIDEOS}</NoVideosMessage>;
  }

  const defaultThumbnail = 'https://via.placeholder.com/120x67.png?text=No+Image';

  const formatDuration = (duration) => {
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
  };

  const RowRenderer = useCallback(({ index, style }) => {
    const video = videos[index];
    const thumbnailUrl = video.thumbnails?.medium?.url || 
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
    const duration = formatDuration(video.contentDetails?.duration);
    const category = video.category || MESSAGES.UNKNOWN;

    const uniqueKey = video.id || video.videoId || `video-${video.etag}`;

    return (
      <Row key={uniqueKey} style={style}>
        <Cell $flex={2}>
          <StyledLink to={`/video/${video.id || video.videoId}`}>
            <ThumbnailImage src={proxyThumbnailUrl} alt={title} />
          </StyledLink>
        </Cell>
        <Cell $flex={4}>
          <StyledLink to={`/video/${video.id || video.videoId}`}>{title}</StyledLink>
        </Cell>
        <Cell $flex={2}>{channelTitle}</Cell>
        <Cell $flex={1}>{viewCount}</Cell>
        <Cell $flex={1}>{publishedAt}</Cell>
        <Cell $flex={1}>{duration}</Cell>
        <Cell $flex={1}>{category}</Cell>
      </Row>
    );
  }, [videos]);

  return (
    <ErrorBoundary>
      <TableContainer>
        <TableHeader>
          <HeaderCell $flex={2}>{MESSAGES.THUMBNAIL}</HeaderCell>
          <HeaderCell $flex={4} onClick={() => onSort('title')}>
            {MESSAGES.TITLE} {getSortIndicator('title', sortConfig)}
          </HeaderCell>
          <HeaderCell $flex={2} onClick={() => onSort('channelTitle')}>
            {MESSAGES.CHANNEL} {getSortIndicator('channelTitle', sortConfig)}
          </HeaderCell>
          <HeaderCell $flex={1} onClick={() => onSort('viewCount')}>
            {MESSAGES.VIEW_COUNT} {getSortIndicator('viewCount', sortConfig)}
          </HeaderCell>
          <HeaderCell $flex={1} onClick={() => onSort('publishedAt')}>
            {MESSAGES.PUBLISHED_AT} {getSortIndicator('publishedAt', sortConfig)}
          </HeaderCell>
          <HeaderCell $flex={1} onClick={() => onSort('duration')}>
            {MESSAGES.DURATION} {getSortIndicator('duration', sortConfig)}
          </HeaderCell>
          <HeaderCell $flex={1} onClick={() => onSort('category')}>
            {MESSAGES.CATEGORY} {getSortIndicator('category', sortConfig)}
          </HeaderCell>
        </TableHeader>
        <List
          height={600}
          itemCount={videos.length}
          itemSize={100}
          width="100%"
        >
          {RowRenderer}
        </List>
      </TableContainer>
    </ErrorBoundary>
  );
});

export default VideoTable;