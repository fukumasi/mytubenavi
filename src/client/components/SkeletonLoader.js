import React from 'react';
import styled, { keyframes } from 'styled-components';
import PropTypes from 'prop-types';

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

const SkeletonWrapper = styled.div`
  background: ${({ theme }) => theme.colors.skeletonBackground || '#f6f7f8'};
  background-image: linear-gradient(
    to right,
    ${({ theme }) => theme.colors.skeletonBackground || '#f6f7f8'} 0%,
    ${({ theme }) => theme.colors.skeletonHighlight || '#edeef1'} 20%,
    ${({ theme }) => theme.colors.skeletonBackground || '#f6f7f8'} 40%,
    ${({ theme }) => theme.colors.skeletonBackground || '#f6f7f8'} 100%
  );
  background-repeat: no-repeat;
  background-size: 800px 104px;
  display: inline-block;
  position: relative;
  animation-duration: ${({ speed }) => speed || '1s'};
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: ${shimmer};
  animation-timing-function: linear;
  width: ${({ width }) => width || '100%'};
  height: ${({ height }) => height || '16px'};
  margin-bottom: ${({ marginBottom }) => marginBottom || '8px'};
  border-radius: ${({ borderRadius }) => borderRadius || '0'};
`;

const SkeletonTitle = styled(SkeletonWrapper)`
  height: 24px;
  margin-bottom: 10px;
`;

const SkeletonText = styled(SkeletonWrapper)`
  height: 16px;
`;

const SkeletonLoader = ({ 
  lines = 3, 
  showTitle = true, 
  speed,
  width,
  height,
  marginBottom,
  borderRadius
}) => (
  <div role="status" aria-label="コンテンツを読み込み中">
    {showTitle && <SkeletonTitle speed={speed} width={width} borderRadius={borderRadius} />}
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonText 
        key={index} 
        speed={speed}
        width={width}
        height={height}
        marginBottom={marginBottom}
        borderRadius={borderRadius}
      />
    ))}
    <span className="sr-only">コンテンツを読み込み中...</span>
  </div>
);

SkeletonLoader.propTypes = {
  lines: PropTypes.number,
  showTitle: PropTypes.bool,
  speed: PropTypes.string,
  width: PropTypes.string,
  height: PropTypes.string,
  marginBottom: PropTypes.string,
  borderRadius: PropTypes.string,
};

export default React.memo(SkeletonLoader);

// TODO: さまざまなスケルトンレイアウト（カード、リスト項目など）のサポートを追加
// TODO: カスタムシェイプのサポートを追加
// TODO: アニメーション方向のカスタマイズオプションを追加
// TODO: ダークモードのサポートを追加