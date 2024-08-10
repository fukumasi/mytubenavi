import React from 'react';
import styled from 'styled-components';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

const NotFoundTitle = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const NotFoundMessage = styled.p`
  font-size: 1.2rem;
`;

const NotFound = () => {
  return (
    <NotFoundContainer>
      <NotFoundTitle>404</NotFoundTitle>
      <NotFoundMessage>ページが見つかりません。</NotFoundMessage>
    </NotFoundContainer>
  );
};

export default NotFound;