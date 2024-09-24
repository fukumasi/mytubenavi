import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import themes from '../styles/theme';

const ToggleButton = styled.button`
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.small};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.background};
  }
`;

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <ToggleButton onClick={toggleTheme} aria-label="テーマ切り替え">
      {theme === themes.light ? '🌙' : '☀️'}
    </ToggleButton>
  );
};

export default ThemeToggle;