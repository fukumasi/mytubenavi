import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const TableContainer = styled.div`
  width: 100%;
`;

const TableHeader = styled.div`
  display: flex;
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  font-weight: bold;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const HeaderCell = styled.div`
  flex: ${props => props.$flex || 1};
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundHover};
  }
`;

const Row = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundHover};
  }
`;

const Cell = styled.div`
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
  color: ${({ theme }) => theme.colors.textLight};
`;

const SortIndicator = styled.span`
  margin-left: 5px;
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const VideoTable = React.memo(({ videos, onSort, sortConfig }) => {
  if (!videos || videos.length === 0) {
    return <NoVideosMessage>動画が見つかりません</NoVideosMessage>;
  }

  const getSortIndicator = (columnName) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === 'ascending' ? '▲' : '▼';
    }
    return '';
  };

  const defaultThumbnail = 'https://via.placeholder.com/120x67.png?text=No+Image';

  const formatDuration = (duration) => {
    if (!duration) return '不明';
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '不明';
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
  };

  console.log('Videos prop:', videos); // デバッグ用

  return (
    <TableContainer>
      <TableHeader>
        <HeaderCell $flex={2}>サムネイル</HeaderCell>
        <HeaderCell $flex={4} onClick={() => onSort('title')}>
          タイトル {getSortIndicator('title')}
        </HeaderCell>
        <HeaderCell $flex={2} onClick={() => onSort('channelTitle')}>
          チャンネル {getSortIndicator('channelTitle')}
        </HeaderCell>
        <HeaderCell $flex={1} onClick={() => onSort('viewCount')}>
          再生回数 {getSortIndicator('viewCount')}
        </HeaderCell>
        <HeaderCell $flex={1} onClick={() => onSort('publishedAt')}>
          投稿日 {getSortIndicator('publishedAt')}
        </HeaderCell>
        <HeaderCell $flex={1} onClick={() => onSort('duration')}>
          長さ {getSortIndicator('duration')}
        </HeaderCell>
      </TableHeader>
      {videos.map((video) => {
        const thumbnailUrl = video.thumbnails?.medium?.url || 
                             video.thumbnails?.default?.url || 
                             video.snippet?.thumbnails?.medium?.url ||
                             video.snippet?.thumbnails?.default?.url ||
                             defaultThumbnail;
        
        const title = video.title || video.snippet?.title || 'タイトルなし';
        const channelTitle = video.channelTitle || video.snippet?.channelTitle || '不明';
        const viewCount = (video.statistics?.viewCount || video.viewCount || 0).toLocaleString();
        const publishedAt = new Date(video.publishedAt || video.snippet?.publishedAt || Date.now()).toLocaleDateString();
        const duration = formatDuration(video.contentDetails?.duration);

        const uniqueKey = video.id || video.videoId || `video-${video.etag}`;

        return (
          <Row key={uniqueKey}>
            <Cell $flex={2}>
              <StyledLink to={`/video/${video.id || video.videoId}`}>
                <ThumbnailImage src={thumbnailUrl} alt={title} />
              </StyledLink>
            </Cell>
            <Cell $flex={4}>
              <StyledLink to={`/video/${video.id || video.videoId}`}>{title}</StyledLink>
            </Cell>
            <Cell $flex={2}>{channelTitle}</Cell>
            <Cell $flex={1}>{viewCount}</Cell>
            <Cell $flex={1}>{publishedAt}</Cell>
            <Cell $flex={1}>{duration}</Cell>
          </Row>
        );
      })}
    </TableContainer>
  );
});

export default VideoTable;