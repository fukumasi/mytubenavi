import React from 'react';
import styled from 'styled-components';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  cursor: pointer;
  // ... その他のスタイル
`;

const NoVideosMessage = styled.p`
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: #666;
`;

const VideoTable = React.memo(({ videos, onSort }) => {
  if (videos.length === 0) {
    return <NoVideosMessage>No videos found</NoVideosMessage>;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th onClick={() => onSort('title')}>タイトル</Th>
          <Th onClick={() => onSort('viewCount')}>再生回数</Th>
          <Th onClick={() => onSort('publishedAt')}>投稿日</Th>
        </tr>
      </thead>
      <tbody>
        {videos.map(video => (
          <tr key={video._id}>
            <td>{video.title}</td>
            <td>{video.viewCount.toLocaleString()}</td>
            <td>{new Date(video.publishedAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
});

export default VideoTable;