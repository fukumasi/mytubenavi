import React from 'react';
import styled from 'styled-components';

const GenreListContainer = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const GenreItem = styled.li`
  margin-bottom: 10px;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
  ${({ selected }) => selected && `
    font-weight: bold;
    color: #007bff;
  `}
`;

const genres = [
  { id: 'all', name: 'すべて' },
  { id: 'entertainment', name: 'エンターテイメント' },
  { id: 'music', name: '音楽' },
  { id: 'sports', name: 'スポーツ' },
  { id: 'gaming', name: 'ゲーム' },
  { id: 'education', name: '教育' },
  { id: 'science', name: '科学と技術' },
  { id: 'travel', name: '旅行' },
];

const GenreList = ({ onGenreChange, selectedGenre }) => {
  return (
    <GenreListContainer>
      {genres.map((genre) => (
        <GenreItem
          key={genre.id}
          onClick={() => onGenreChange(genre.id)}
          selected={selectedGenre === genre.id}
          role="option"
          aria-selected={selectedGenre === genre.id}
        >
          {genre.name}
        </GenreItem>
      ))}
    </GenreListContainer>
  );
};

export default React.memo(GenreList);