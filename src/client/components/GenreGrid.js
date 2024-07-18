import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const GenreCard = styled(Link)`
  background-color: #f0f0f0;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  text-decoration: none;
  color: #333;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 150px;

  &:hover {
    background-color: #e0e0e0;
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const GenreName = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

const GenreIcon = styled.i`
  font-size: 2rem;
  margin-bottom: 10px;
`;

const GenreGrid = ({ genres }) => {
  return (
    <GridContainer>
      {genres.map(genre => (
        <GenreCard key={genre._id} to={`/genre/${genre.slug}`}>
          {genre.icon && <GenreIcon className={`fas ${genre.icon}`} />}
          <GenreName>{genre.name}</GenreName>
        </GenreCard>
      ))}
    </GridContainer>
  );
};

GenreGrid.propTypes = {
  genres: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      icon: PropTypes.string
    })
  ).isRequired
};

export default React.memo(GenreGrid);