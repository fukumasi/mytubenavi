import React from 'react';
import styled from 'styled-components';
import AdSpace from './AdSpace';
import GenreGrid from './GenreGrid';
import VideoList from './VideoList';
import { dummyVideos } from '../dummyData';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Sidebar = styled.aside`
  width: 20%;
`;

const MainContent = styled.main`
  width: 55%;
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
        <h2>おすすめ動画</h2>
        <VideoList videos={dummyVideos} loading={false} error={null} />
      </MainContent>
      <Sidebar>
        <AdSpace text="広告枠" />
        <AdSpace text="有料掲載枠" />
      </Sidebar>
    </Container>
  );
};

export default Home;