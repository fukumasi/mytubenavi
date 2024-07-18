import React from 'react';
import styled from 'styled-components';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 12px;
  text-align: left;
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text};
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const VideoList = ({ videos }) => {
  return (
    <Table>
      <thead>
        <tr>
          <Th>サムネイル</Th>
          <Th>タイトル</Th>
          <Th>チャンネル</Th>
          <Th>再生回数</Th>
          <Th>評価</Th>
          <Th>投稿日</Th>
        </tr>
      </thead>
      <tbody>
        {videos.map(video => (
          <tr key={video.id}>
            <Td><img src={video.thumbnail} alt={video.title} /></Td>
            <Td>{video.title}</Td>
            <Td>{video.channel}</Td>
            <Td>{video.views.toLocaleString()}回</Td>
            <Td>{video.rating}/5.0</Td>
            <Td>{video.uploadDate}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default VideoList;