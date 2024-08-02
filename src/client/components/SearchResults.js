
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import VideoList from './VideoList';
import { useYouTubeSearch } from '../hooks.js';

const SearchResults = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q');

  const { execute: searchVideos, loading, error, data: videos } = useYouTubeSearch();

  useEffect(() => {
    if (query) {
      console.log('Searching for:', query); // 追加
      searchVideos(query).then(result => {
        console.log('Search result:', result); // 追加
      }).catch(err => {
        console.error('Search error:', err); // 追加
      });
    }
  }, [query, searchVideos]);

  console.log('Render - videos:', videos, 'loading:', loading, 'error:', error); // 追加

  return (
    <SearchResultsContainer>
      <SearchHeader>「{query}」の検索結果</SearchHeader>
      <VideoList videos={videos || []} loading={loading} error={error} />
    </SearchResultsContainer>
  );
};

export default SearchResults;