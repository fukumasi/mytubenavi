import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

const SkeletonWrapper = styled.div`
  background: #f6f7f8;
  background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
  background-repeat: no-repeat;
  background-size: 800px 104px;
  display: inline-block;
  position: relative;
  animation-duration: 1s;
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: ${shimmer};
  animation-timing-function: linear;
`;

const SkeletonTitle = styled(SkeletonWrapper)`
  width: 100%;
  height: 24px;
  margin-bottom: 10px;
`;

const SkeletonText = styled(SkeletonWrapper)`
  width: 100%;
  height: 16px;
  margin-bottom: 8px;
`;

const SkeletonLoader = () => (
  <div>
    <SkeletonTitle />
    <SkeletonText />
    <SkeletonText />
    <SkeletonText />
  </div>
);

export default SkeletonLoader;