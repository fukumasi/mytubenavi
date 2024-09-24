import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useTheme } from '../hooks/useTheme';
import SearchBar from '../components/SearchBar';
import VideoList from '../components/VideoList';
import PopularVideos from '../components/PopularVideos';
import GenreList from '../components/GenreList';
import FeaturedVideos from '../components/FeaturedVideos';
import { searchVideos } from '../api/youtube';

const HomeContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const ContentWrapper = styled.div`
  display: flex;
  gap: 20px;
`;

const MainContent = styled.div`
  flex: 1;
`;

const Sidebar = styled.div`
  width: 300px;
`;

const Home = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSearch = async (query) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await searchVideos(query);
      setSearchResults(results);
    } catch (err) {
      setError(t('searchError'));
      // エラーログ出力の代わりに適切なエラーハンドリングを行う
      // 例: エラーメッセージを表示する状態を更新する
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HomeContainer>
      <Title>{t('welcome')}</Title>
      <SearchBar onSearch={handleSearch} />
      <ContentWrapper>
        <MainContent>
          {isLoading && <p>{t('loading')}</p>}
          {error && <p>{error}</p>}
          {searchResults.length > 0 ? (
            <VideoList videos={searchResults} />
          ) : (
            <>
              <PopularVideos />
              <FeaturedVideos />
            </>
          )}
        </MainContent>
        <Sidebar>
          <GenreList />
        </Sidebar>
      </ContentWrapper>
    </HomeContainer>
  );
};

export default Home;