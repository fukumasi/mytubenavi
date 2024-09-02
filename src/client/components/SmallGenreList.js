import React from 'react';
import styled from 'styled-components';

const GenreList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const GenreItem = styled.li`
  cursor: pointer;
  padding: 8px;
  &:hover {
    background-color: #f0f0f0;
  }
  ${props => props.selected && `
    background-color: #e0e0e0;
    font-weight: bold;
  `}
`;

const SmallGenreList = ({ genres, onSelect, selectedGenre }) => {
  return (
    <GenreList>
      {genres.map(genre => (
        <GenreItem
          key={genre.id}
          onClick={() => onSelect(genre)}
          selected={selectedGenre && selectedGenre.id === genre.id}
        >
          {genre.name}
        </GenreItem>
      ))}
    </GenreList>
  );
};

export default SmallGenreList;