import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
`;

const NotFoundTitle = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const NotFoundMessage = styled.p`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
`;

const StyledLink = styled(Link)`
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
  &:hover {
    text-decoration: underline;
  }
`;

const NotFound = () => {
  return (
    <NotFoundContainer>
      <NotFoundTitle>404</NotFoundTitle>
      <NotFoundMessage>
        申し訳ありませんが、お探しのページが見つかりません。<br />
        URLをご確認いただくか、以下のリンクをお試しください。
      </NotFoundMessage>
      <StyledLink to="/">ホームページに戻る</StyledLink>
    </NotFoundContainer>
  );
};

export default NotFound;