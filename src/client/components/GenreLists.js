import React from 'react';
import styled from 'styled-components';

const GenreList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const GenreItem = styled.li`
  cursor: pointer;
  padding: 8px;
  margin: 4px 0;
  background-color: ${props => props.selected ? '#e0e0e0' : 'transparent'};
  &:hover {
    background-color: #f0f0f0;
  }
`;

const GenreListComponent = ({ genres, onSelect, selectedGenre, title }) => (
  <div>
    <h3>{title}</h3>
    <GenreList>
      {genres.map(genre => (
        <GenreItem 
          key={genre._id} 
          onClick={() => onSelect(genre)}
          selected={selectedGenre && selectedGenre._id === genre._id}
        >
          {genre.name}
        </GenreItem>
      ))}
    </GenreList>
  </div>
);

export const LargeGenreList = (props) => (
  <GenreListComponent {...props} title="大ジャンル" />
);

export const MediumGenreList = (props) => (
  <GenreListComponent {...props} title="中ジャンル" />
);

export const SmallGenreList = (props) => (
  <GenreListComponent {...props} title="小ジャンル" />
);