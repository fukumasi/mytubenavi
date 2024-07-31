import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

const GenreContainer = styled.div`
  padding: 20px;
`;

const GenreTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const GenrePage = () => {
  const { genreSlug } = useParams();

  return (
    <GenreContainer>
      <GenreTitle>{genreSlug} Videos</GenreTitle>
      {/* ここに動画リストなどのコンテンツを追加 */}
    </GenreContainer>
  );
};

export default GenrePage;