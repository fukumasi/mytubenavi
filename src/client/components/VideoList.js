import React from "react";
import PropTypes from 'prop-types';
import styled from "styled-components";
import VideoCard from "./VideoCard";

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
  // スタイルは省略
`;

const VideoList = ({ videos = [], isLoading, error }) => {
  if (isLoading) {
    return <LoadingSpinner aria-label="動画を読み込み中" />;
  }

  if (error) {
    return <Message role="alert">エラーが発生しました: {error}</Message>;
  }

  if (videos.length === 0) {
    return <Message>動画がありません。</Message>;
  }

  return (
    <VideoListContainer role="list" aria-label="動画一覧">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </VideoListContainer>
  );
};

VideoList.propTypes = {
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      thumbnailUrl: PropTypes.string, // thumbnailUrlをオプショナルに変更
      channelTitle: PropTypes.string.isRequired,
      publishedAt: PropTypes.string, // publishedAtはオプショナルのまま
      viewCount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // viewCountの型を数値または文字列に変更
      duration: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
};

export default React.memo(VideoList);
