import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { searchVideos, getDummyVideos } from '../api/youtube';
import VideoTable from '../components/VideoTable';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import AdSpace from '../components/AdSpace';
import FeaturedVideos from '../components/FeaturedVideos';
import GenreList from '../components/GenreList';

const SearchContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 4fr 200px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
`;

const LeftColumn = styled.div`
  grid-column: 1;
`;

const MainContent = styled.div`
  grid-column: 2;
  display: flex;
  flex-direction: column;
`;

const VideoTableContainer = styled.div`
  margin-bottom: 20px;
`;

const PaginationContainer = styled.div`
  margin-top: 20px;
`;

const RightColumn = styled.div`
  grid-column: 3;
  width: 200px;
`;

const VIDEOS_PER_PAGE = 20;

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [sortConfig, setSortConfig] = useState({ key: 'publishedAt', direction: 'descending' });

  const { data: searchData, isLoading: isSearchLoading, error: searchError } = useQuery(
    ['searchVideos', query, selectedGenre, currentPage, sortConfig],
    () => searchVideos({ 
      q: query, 
      genre: selectedGenre, 
      page: currentPage,
      sort: `${sortConfig.key},${sortConfig.direction}`
    }),
    { 
      enabled: !!query,
      retry: 3,
      onError: (error) => console.error('Search error:', error)
    }
  );

  const { data: dummyVideos, isLoading: isDummyLoading, error: dummyError } = useQuery(
    'dummyVideos',
    getDummyVideos,
    {
      staleTime: Infinity,
      retry: 3,
      onError: (error) => console.error('Dummy videos error:', error)
    }
  );

  const handleGenreChange = useCallback((genre) => {
    setSelectedGenre(genre);
    setCurrentPage(1);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', '1');
      return newParams;
    });
  }, [setSearchParams]);

  const handleSort = useCallback((key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', page.toString());
      return newParams;
    });
  }, [setSearchParams]);

  useEffect(() => {
    console.log('Search Data:', searchData);
    console.log('Dummy Videos:', dummyVideos);
    console.log('Query:', query);
    console.log('Is Loading:', isSearchLoading, isDummyLoading);
    if (searchError) console.error('Search Error:', searchError);
    if (dummyError) console.error('Dummy Videos Error:', dummyError);
  }, [searchData, dummyVideos, query, isSearchLoading, isDummyLoading, searchError, dummyError]);

  if (isSearchLoading || isDummyLoading) return <LoadingSpinner />;
  if (searchError || dummyError) return <ErrorMessage message={`データの取得中にエラーが発生しました: ${searchError?.message || dummyError?.message}`} />;

  const displayVideos = query && searchData?.items ? searchData.items : (dummyVideos || []);
  const totalVideos = searchData?.pageInfo?.totalResults || displayVideos.length;
  const totalPages = Math.ceil(totalVideos / VIDEOS_PER_PAGE);
  const paginatedVideos = displayVideos.slice((currentPage - 1) * VIDEOS_PER_PAGE, currentPage * VIDEOS_PER_PAGE);

  return (
    <SearchContainer>
      <LeftColumn>
        <h3>ジャンル</h3>
        <GenreList onGenreChange={handleGenreChange} selectedGenre={selectedGenre} />
      </LeftColumn>

      <MainContent>
        <h2>{query ? `「${query}」の検索結果` : 'おすすめ動画'}</h2>
        {paginatedVideos.length > 0 ? (
          <>
            <VideoTableContainer>
              <VideoTable 
                videos={paginatedVideos} 
                onSort={handleSort}
                sortConfig={sortConfig}
              />
            </VideoTableContainer>
            {totalPages > 1 && (
              <PaginationContainer>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </PaginationContainer>
            )}
          </>
        ) : (
          <p>表示する動画がありません。</p>
        )}
      </MainContent>

      <RightColumn>
        <h3>有料掲載動画</h3>
        <FeaturedVideos />
        <AdSpace text="右カラム広告1" />
        <AdSpace text="右カラム広告2" />
        <AdSpace text="右カラム広告3" />
      </RightColumn>
    </SearchContainer>
  );
};

export default SearchResults;