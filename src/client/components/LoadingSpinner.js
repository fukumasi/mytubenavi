// src\client\components\LoadingSpinner.js
import React from "react";
import styled, { keyframes, css } from "styled-components";
import { useTranslation } from 'react-i18next';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${props => props.height || '100px'};
`;

const Spinner = styled.div`
  border: 4px solid ${({ theme }) => theme.colors.backgroundLight};
  border-top: 4px solid ${({ theme, color }) => color || theme.colors.primary};
  border-radius: 50%;
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  animation: ${spin} ${props => props.speed || '1s'} linear infinite;
  
  ${props => props.$paused && css`
    animation-play-state: paused;
  `}
`;

const LoadingText = styled.p`
  margin-left: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.medium};
`;

const LoadingSpinner = ({ 
  size, 
  speed, 
  containerHeight, 
  showText = true,
  color,
  paused = false,
  ariaLabel
}) => {
  const { t } = useTranslation();

  return (
    <SpinnerContainer 
      data-testid="loading-spinner"
      height={containerHeight}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || t('loading.ariaLabel')}
    >
      <Spinner size={size} speed={speed} color={color} $paused={paused} />
      {showText && <LoadingText>{t('loading.message')}</LoadingText>}
    </SpinnerContainer>
  );
};

export default React.memo(LoadingSpinner);