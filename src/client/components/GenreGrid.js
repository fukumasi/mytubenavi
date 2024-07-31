import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

const GenreItem = styled(Link)`
  background-color: #e0e0e0;
  padding: 10px;
  text-align: center;
  border-radius: 5px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const GenreIcon = styled.span`
  font-size: 24px;
  margin-bottom: 5px;
`;

const genres = [
  { name: 'エンタメ', icon: '📺' },
  { name: '音楽', icon: '🎵' },
  { name: 'ゲーム', icon: '🎮' },
  { name: 'スポーツ', icon: '⚽' },
  { name: 'ニュース', icon: '📰' },
  { name: '教育', icon: '🎓' },
  { name: '科学技術', icon: '🔬' },
  { name: '料理', icon: '🍳' },
  { name: '旅行', icon: '✈️' },
  { name: 'ファッション', icon: '👗' },
  { name: 'ビューティー', icon: '💄' },
  { name: 'ペット', icon: '🐾' },
  { name: 'DIY', icon: '🔨' },
  { name: 'アート', icon: '🎨' },
  { name: 'ビジネス', icon: '💼' },
  { name: 'テクノロジー', icon: '💻' },
  { name: '自動車', icon: '🚗' },
  { name: '健康', icon: '🏋️‍♀️' },
  { name: '映画', icon: '🎬' },
  { name: 'アニメ', icon: '🦸‍♂️' }
];

const GenreGrid = () => {
  return (
    <Grid>
      {genres.map((genre, index) => (
        <GenreItem key={index} to={`/genre/${genre.name}`}>
          <GenreIcon>{genre.icon}</GenreIcon>
          {genre.name}
        </GenreItem>
      ))}
    </Grid>
  );
};

export default GenreGrid;