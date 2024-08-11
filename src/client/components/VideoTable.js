import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const TableContainer = styled.div`
  width: 100%;
`;

const TableHeader = styled.div`
  display: flex;
  background-color: #f0f0f0;
  font-weight: bold;
  border-bottom: 1px solid #ddd;
`;

const HeaderCell = styled.div`
  flex: ${props => props.$flex || 1};
  padding: 10px;
  cursor: pointer;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

const Row = styled.div`
  display: flex;
  border-bottom: 1px solid #ddd;
  &:last-child {
    border-bottom: none;
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
`;

const NoVideosMessage = styled.p`
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: #666;
`;

const SortIndicator = styled.span`
  margin-left: 5px;
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
      </TableHeader>
      {videos.map((video, index) => {
        const thumbnailUrl = video.thumbnails?.medium?.url || 
                             video.thumbnails?.default?.url || 
                             video.snippet?.thumbnails?.medium?.url ||
                             video.snippet?.thumbnails?.default?.url ||
                             defaultThumbnail;
        
        const title = video.title || video.snippet?.title || 'タイトルなし';
        const channelTitle = video.channelTitle || video.snippet?.channelTitle || '不明';
        const viewCount = (video.statistics?.viewCount || video.viewCount || 0).toLocaleString();
        const publishedAt = new Date(video.publishedAt || video.snippet?.publishedAt || Date.now()).toLocaleDateString();

        return (
          <Row key={video.id || video.videoId || index}>
            <Cell $flex={2}>
              <Link to={`/video/${video.id || video.videoId}`}>
                <ThumbnailImage src={thumbnailUrl} alt={title} />
              </Link>
            </Cell>
            <Cell $flex={4}>
              <Link to={`/video/${video.id || video.videoId}`}>{title}</Link>
            </Cell>
            <Cell $flex={2}>{channelTitle}</Cell>
            <Cell $flex={1}>{viewCount}</Cell>
            <Cell $flex={1}>{publishedAt}</Cell>
          </Row>
        );
      })}
    </TableContainer>
  );
});

export default VideoTable;