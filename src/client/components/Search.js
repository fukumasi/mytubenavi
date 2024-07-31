import React, { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const SearchContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const SearchForm = styled.form`
  display: flex;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  flex-grow: 1;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
`;

const SearchButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  &:disabled {
    background-color: #cccccc;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  margin-bottom: 10px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const VideoCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: auto;
  border-radius: 4px;
`;

const VideoTitle = styled.h3`
  margin: 10px 0;
  font-size: 16px;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const PageButton = styled.button`
  margin: 0 5px;
  padding: 5px 10px;
  background-color: ${props => props.active ? '#0066cc' : '#f0f0f0'};
  color: ${props => props.active ? 'white' : 'black'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const handleSearch = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/videos/search?query=${query}&page=${page}&limit=10`);
      setResults(response.data.videos);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
      console.error('Error searching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    handleSearch(newPage);
  };

  return (
    <SearchContainer>
      <h2>Search Videos</h2>
      <SearchForm onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
        <SearchInput
          type="text"
          id="search-query"
          name="search-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
        />
        <SearchButton type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </SearchButton>
      </SearchForm>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <VideoGrid>
        {results.map((video) => (
          <VideoCard key={video._id}>
            <VideoThumbnail src={video.thumbnailUrl} alt={video.title} />
            <VideoTitle>{video.title}</VideoTitle>
          </VideoCard>
        ))}
      </VideoGrid>
      {totalPages > 1 && (
        <Pagination>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <PageButton
              key={page}
              onClick={() => handlePageChange(page)}
              disabled={page === currentPage}
              active={page === currentPage}
            >
              {page}
            </PageButton>
          ))}
        </Pagination>
      )}
    </SearchContainer>
  );
};

export default Search;