import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  cursor: pointer;
  padding: 10px;
  background-color: #f0f0f0;
  text-align: left;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

const Td = styled.td`
  padding: 10px;
  border-bottom: 1px solid #ddd;
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

  // デフォルトのサムネイル画像URL
  const defaultThumbnail = 'https://via.placeholder.com/120x67.png?text=No+Image';

  return (
    <Table>
      <thead>
        <tr>
          <Th>サムネイル</Th>
          <Th onClick={() => onSort('title')}>
            タイトル {getSortIndicator('title')}
          </Th>
          <Th onClick={() => onSort('channelTitle')}>
            チャンネル {getSortIndicator('channelTitle')}
          </Th>
          <Th onClick={() => onSort('viewCount')}>
            再生回数 {getSortIndicator('viewCount')}
          </Th>
          <Th onClick={() => onSort('publishedAt')}>
            投稿日 {getSortIndicator('publishedAt')}
          </Th>
        </tr>
      </thead>
      <tbody>
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

          return (
            <tr key={video.id || video.videoId || Math.random().toString()}>
              <Td>
                <Link to={`/video/${video.id || video.videoId}`}>
                  <ThumbnailImage 
                    src={thumbnailUrl} 
                    alt={title} 
                  />
                </Link>
              </Td>
              <Td>
                <Link to={`/video/${video.id || video.videoId}`}>{title}</Link>
              </Td>
              <Td>{channelTitle}</Td>
              <Td>{viewCount}</Td>
              <Td>{publishedAt}</Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
});

export default VideoTable;