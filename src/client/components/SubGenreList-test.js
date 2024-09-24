import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const SubGenreListContainer = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const SubGenreItem = styled.li`
  margin-bottom: 10px;
`;

const SubGenreLink = styled(Link)`
  text-decoration: none;
  color: ${(props) => props.theme.colors.text};
  &:hover {
    color: ${(props) => props.theme.colors.primary};
  }
`;

const SubGenreList = ({ subGenres }) => {
  return (
    <SubGenreListContainer>
      {subGenres.map((subGenre) => (
        <SubGenreItem key={subGenre.id}>
          <SubGenreLink to={`/genre/${subGenre.id}`}>
            {subGenre.name}
          </SubGenreLink>
        </SubGenreItem>
      ))}
    </SubGenreListContainer>
  );
};

export default SubGenreList;