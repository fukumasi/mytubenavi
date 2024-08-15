import React from "react";
import styled from "styled-components";
import AdSpace from "../components/AdSpace";
import GenreGrid from "../components/GenreGrid";
import VideoList from "../components/VideoList";
import { dummyVideos } from "../dummyData";
import { useTheme } from "../hooks/useTheme";

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: ${({ theme }) => theme.maxWidth || '1200px'};
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing?.medium || '20px'};

  @media (max-width: ${({ theme }) => theme.breakpoints?.tablet || '768px'}) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside`
  width: 20%;

  @media (max-width: ${({ theme }) => theme.breakpoints?.tablet || '768px'}) {
    width: 100%;
    margin-bottom: ${({ theme }) => theme.spacing?.medium || '20px'};
  }
`;

const MainContent = styled.main`
  width: 55%;

  @media (max-width: ${({ theme }) => theme.breakpoints?.tablet || '768px'}) {
    width: 100%;
    order: -1;
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize?.large || '24px'};
  color: ${({ theme }) => theme.colors?.text || '#000'};
  margin-bottom: ${({ theme }) => theme.spacing?.medium || '20px'};
`;

const Home = () => {
  const theme = useTheme();

  return (
    <Container theme={theme}>
      <Sidebar theme={theme}>
        <AdSpace text="広告枠" />
        <AdSpace text="有料掲載枠" />
      </Sidebar>
      <MainContent>
        <SectionTitle theme={theme}>ジャンル一覧</SectionTitle>
        <GenreGrid />
        <SectionTitle theme={theme}>おすすめ動画</SectionTitle>
        <VideoList videos={dummyVideos} loading={false} error={null} />
      </MainContent>
      <Sidebar theme={theme}>
        <AdSpace text="広告枠" />
        <AdSpace text="有料掲載枠" />
      </Sidebar>
    </Container>
  );
};

export default Home;