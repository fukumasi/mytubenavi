import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { formatDistance, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:hover, &:focus {
    transform: translateY(-5px);
    outline: none;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ThumbnailWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 アスペクト比 */
`;

const Thumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing.small};
`;

const Title = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.small};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ChannelName = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.xsmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.xsmall};
`;

const Duration = styled.span`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: ${({ theme }) => theme.fontSizes.xsmall};
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const VideoCard = ({ video }) => {
  const {
    id,
    title,
    channelTitle = '不明なチャンネル',
    thumbnailUrl,
    publishedAt,
    viewCount,
    duration
  } = video;

  const formattedDate = (() => {
    if (!publishedAt) return '日付不明';
    const date = new Date(publishedAt);
    if (isValid(date)) {
      return formatDistance(date, new Date(), { addSuffix: true, locale: ja });
    }
    return '日付不明';
  })();

  const formattedViewCount = typeof viewCount === 'number' ? `${viewCount.toLocaleString()} 回視聴` : '視聴回数不明';

  return (
    <Card to={`/video/${id}`}>
      <ThumbnailWrapper>
        <Thumbnail
          src={thumbnailUrl || 'https://via.placeholder.com/120x90.png?text=No+Image'}
          alt={`${title}のサムネイル`}
          loading="lazy"
        />
        {duration && <Duration aria-label={`動画の長さ: ${duration}`}>{duration}</Duration>}
      </ThumbnailWrapper>
      <Content>
        <Title>{title}</Title>
        <ChannelName>{channelTitle}</ChannelName>
        <MetaInfo>
          <span>{formattedViewCount}</span>
          <span>{formattedDate}</span>
        </MetaInfo>
      </Content>
      <VisuallyHidden>
        {`${title}, ${channelTitle}による動画。${formattedViewCount}、${formattedDate}に公開。`}
      </VisuallyHidden>
    </Card>
  );
};

VideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    channelTitle: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    publishedAt: PropTypes.string,
    viewCount: PropTypes.number,
    duration: PropTypes.string,
  }).isRequired,
};

export default React.memo(VideoCard);

