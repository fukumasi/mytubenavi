// src\client\components\GenreGrid.js
import React from "react";
import PropTypes from 'prop-types';
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
`;

const GenreItem = styled(Link)`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  padding: 10px;
  text-align: center;
  border-radius: ${({ theme }) => theme.borderRadius};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: background-color 0.2s ease-in-out;

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.backgroundDark};
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const GenreIcon = styled.span`
  font-size: 24px;
  margin-bottom: 5px;
`;

const genres = [
  { name: "entertainment", icon: "📺" },
  { name: "music", icon: "🎵" },
  { name: "gaming", icon: "🎮" },
  { name: "sports", icon: "⚽" },
  { name: "news", icon: "📰" },
  { name: "education", icon: "🎓" },
  { name: "science", icon: "🔬" },
  { name: "cooking", icon: "🍳" },
  { name: "travel", icon: "✈️" },
  { name: "fashion", icon: "👗" },
  { name: "beauty", icon: "💄" },
  { name: "pets", icon: "🐾" },
  { name: "diy", icon: "🔨" },
  { name: "art", icon: "🎨" },
  { name: "business", icon: "💼" },
  { name: "technology", icon: "💻" },
  { name: "automotive", icon: "🚗" },
  { name: "health", icon: "🏋️‍♀️" },
  { name: "movies", icon: "🎬" },
  { name: "anime", icon: "🦸‍♂️" },
];

const GenreGrid = ({ onGenreClick }) => {
  const { t } = useTranslation();

  return (
    <Grid role="list" aria-label={t('genreList')}>
      {genres.map((genre) => (
        <GenreItem 
          key={genre.name} 
          to={`/genre/${encodeURIComponent(genre.name)}`}
          onClick={() => onGenreClick && onGenreClick(genre.name)}
          role="listitem"
        >
          <GenreIcon aria-hidden="true">{genre.icon}</GenreIcon>
          {t(`genres.${genre.name}`)}
        </GenreItem>
      ))}
    </Grid>
  );
};

GenreGrid.propTypes = {
  onGenreClick: PropTypes.func,
};

export default GenreGrid;

// TODO: ジャンルのカスタマイズ機能の追加
// TODO: ジャンルの動的な取得（APIから）
// TODO: ジャンルのソート機能の追加
// TODO: ジャンルの検索機能の追加
// TODO: レスポンシブデザインの改善