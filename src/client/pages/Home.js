import React from 'react';
import styled from 'styled-components';
import AdSpace from '../components/AdSpace';
import GenreGrid from '../components/GenreGrid';
import VideoList from '../components/VideoList';
import { dummyVideos } from '../dummyData';

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: ${({ theme }) => theme.maxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.medium};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside`
  width: 20%;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    margin-bottom: ${({ theme }) => theme.spacing.medium};
  }
`;

const MainContent = styled.main`
  width: 55%;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    order: -1;
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.large};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const Home = () => {
  return (
    <Container>
      <Sidebar>
        <AdSpace text="広告枠" />
        <AdSpace text="有料掲載枠" />
      </Sidebar>
      <MainContent>
        <SectionTitle>ジャンル一覧</SectionTitle>
        <GenreGrid />
        <SectionTitle>おすすめ動画</SectionTitle>
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