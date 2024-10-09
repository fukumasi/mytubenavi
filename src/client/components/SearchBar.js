import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { searchVideos } from '../api/youtube';

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
`;

const SearchForm = styled.form`
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 8px;
`;

const SearchButton = styled.button`
  padding: 8px 16px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 8px;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const SearchBar = ({ onSearch }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (query.trim()) {
      try {
        setError('');
        const results = await searchVideos(query);
        onSearch(results);
        navigate(`/search?q=${encodeURIComponent(query)}`);
      } catch (error) {
        console.error('Search error:', error);
        setError(t('searchError'));
      }
    }
  };

  return (
    <SearchContainer>
      <SearchForm onSubmit={handleSubmit} role="search">
        <VisuallyHidden as="label" htmlFor="search-input">
          {t('searchLabel')}
        </VisuallyHidden>
        <SearchInput
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
        />
        <SearchButton type="submit">
          {t('search')}
        </SearchButton>
      </SearchForm>
      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
    </SearchContainer>
  );
};

export default SearchBar;