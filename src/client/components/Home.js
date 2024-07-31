import React from 'react';
import styled from 'styled-components';
import AdSpace from './AdSpace';
import GenreGrid from './GenreGrid';

const Container = styled.div`
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
`;

const Sidebar = styled.aside`
  width: 20%;
  padding: 20px;
  background-color: #f0f0f0;
`;

const MainContent = styled.main`
  width: 60%;
  padding: 20px;
`;

const Home = () => {
  return (
    <Container>
      <Sidebar>
        <AdSpace text="広告枠" />
        <AdSpace text="有料掲載枠" />
      </Sidebar>
      <MainContent>
        <h2>ジャンル一覧</h2>
        <GenreGrid />
      </MainContent>
      <Sidebar>
        <AdSpace text="広告枠" />
        <AdSpace text="有料掲載枠" />
      </Sidebar>
    </Container>
  );
};

export default Home;