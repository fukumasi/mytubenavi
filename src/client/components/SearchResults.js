import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import VideoList from './VideoList';
import Pagination from './Pagination';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const SearchContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const SearchHeader = styled.h2`
  font-size: 24px;
  margin-bottom: 20px;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #0066cc;
  }
`;

const SearchBar = styled.input`
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
  
  &:focus {
    outline: none;
    border-color: #0066cc;
  }
`;

const SearchResults = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState('relevance');
  const [dateRange, setDateRange] = useState('');
  const [duration, setDuration] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/videos/search?q=${query}&page=${currentPage}&sort=${sort}&dateRange=${dateRange}&duration=${duration}`);
      setVideos(response.data.videos);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || 'エラーが発生しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [query, currentPage, sort, dateRange, duration]);

  useEffect(() => {
    if (query) {
      fetchVideos();
    }
  }, [query, fetchVideos]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'sort') setSort(value);
    if (name === 'dateRange') setDateRange(value);
    if (name === 'duration') setDuration(value);
    setCurrentPage(1);
    navigate(`/search?q=${query}&sort=${value}&dateRange=${dateRange}&duration=${duration}`);
  }, [query, dateRange, duration, navigate]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    navigate(`/search?q=${searchQuery}`);
  }, [searchQuery, navigate]);

  const filterOptions = useMemo(() => ({
    sort: [
      { value: 'relevance', label: '関連度順' },
      { value: 'views', label: '再生回数順' },
      { value: 'date', label: '日付順' },
    ],
    dateRange: [
      { value: '', label: 'すべての期間' },
      { value: '1', label: '24時間以内' },
      { value: '7', label: '1週間以内' },
      { value: '30', label: '1ヶ月以内' },
      { value: '365', label: '1年以内' },
    ],
    duration: [
      { value: '', label: 'すべての長さ' },
      { value: 'short', label: '4分未満' },
      { value: 'medium', label: '4〜20分' },
      { value: 'long', label: '20分以上' },
    ],
  }), []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <SearchContainer>
      <SearchHeader>「{query}」の検索結果</SearchHeader>
      <form onSubmit={handleSearch}>
        <SearchBar 
          type="text" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          placeholder="動画を検索..."
        />
      </form>
      <FilterContainer>
        {Object.entries(filterOptions).map(([filterName, options]) => (
          <Select key={filterName} name={filterName} value={filterName === 'sort' ? sort : filterName === 'dateRange' ? dateRange : duration} onChange={handleFilterChange}>
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        ))}
      </FilterContainer>
      <VideoList videos={videos} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </SearchContainer>
  );
};

export default SearchResults;