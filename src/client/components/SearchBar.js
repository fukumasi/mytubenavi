import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import { debounce } from 'lodash';

const SearchForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  position: relative;
`;

const SearchInput = styled.input`
  flex-grow: 1;
  padding: 12px 40px 12px 12px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryLight};
  }
`;

const SearchButton = styled.button`
  padding: 12px 16px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.medium};
  transition: all 0.3s ease;
  margin-left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.primaryDark};
    outline: none;
  }

  &:focus {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryLight};
  }
`;

const FilterToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.small};
  margin-top: 10px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;

  &:hover, &:focus {
    color: ${({ theme }) => theme.colors.primaryDark};
    outline: none;
  }

  svg {
    margin-right: 5px;
  }
`;

const FilterOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
`;

const FilterSelect = styled.select`
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${({ theme }) => theme.fontSizes.small};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryLight};
  }
`;

const AutocompleteList = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: none;
  list-style-type: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const AutocompleteItem = styled.li`
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }

  &[aria-selected="true"] {
    background-color: ${({ theme }) => theme.colors.primaryLight};
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textLight};
  transition: color 0.2s ease;

  &:hover, &:focus {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    duration: "",
    uploadDate: "",
    sortBy: ""
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(-1);
  const navigate = useNavigate();
  const location = useLocation();
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const savedFilters = localStorage.getItem("searchFilters");
    if (savedFilters) {
      setFilters(JSON.parse(savedFilters));
    }

    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }

    // Parse query params from URL
    const searchParams = new URLSearchParams(location.search);
    const queryFromUrl = searchParams.get('q');
    if (queryFromUrl) {
      setSearchTerm(queryFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    localStorage.setItem("searchFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const debouncedAutocomplete = useCallback(
    debounce((term) => {
      if (term.trim().length > 0) {
        const results = searchHistory.filter(item =>
          item.toLowerCase().includes(term.toLowerCase())
        );
        setAutocompleteResults(results);
      } else {
        setAutocompleteResults([]);
      }
    }, 300),
    [searchHistory]
  );

  useEffect(() => {
    debouncedAutocomplete(searchTerm);
    setSelectedAutocompleteIndex(-1);
  }, [searchTerm, debouncedAutocomplete]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      performSearch(searchTerm.trim());
    }
  };

  const performSearch = (term) => {
    const queryParams = new URLSearchParams({
      q: term,
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
    });
    navigate(`/search?${queryParams}`);

    // Add to search history
    if (!searchHistory.includes(term)) {
      setSearchHistory(prevHistory => [term, ...prevHistory.slice(0, 9)]);
    }

    setAutocompleteResults([]);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleAutocompleteClick = (item) => {
    setSearchTerm(item);
    performSearch(item);
  };

  const handleKeyDown = (e) => {
    if (autocompleteResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedAutocompleteIndex(prevIndex =>
          prevIndex < autocompleteResults.length - 1 ? prevIndex + 1 : prevIndex
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedAutocompleteIndex(prevIndex =>
          prevIndex > 0 ? prevIndex - 1 : -1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedAutocompleteIndex !== -1) {
          handleAutocompleteClick(autocompleteResults[selectedAutocompleteIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setAutocompleteResults([]);
        setSelectedAutocompleteIndex(-1);
        break;
      default:
        break;
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    inputRef.current.focus();
  };

  return (
    <SearchForm onSubmit={handleSubmit} role="search">
      <SearchRow>
        <label htmlFor="search-input" className="sr-only">
          動画を検索
        </label>
        <SearchInput
          id="search-input"
          ref={inputRef}
          type="search"
          placeholder="動画を検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="動画を検索"
          aria-autocomplete="list"
          aria-controls="autocomplete-list"
          aria-activedescendant={selectedAutocompleteIndex !== -1 ? `autocomplete-item-${selectedAutocompleteIndex}` : undefined}
        />
        {searchTerm && (
          <ClearButton type="button" onClick={clearSearch} aria-label="検索をクリア">
            <FaTimes />
          </ClearButton>
        )}
        <SearchButton type="submit" aria-label="検索を実行">
          <FaSearch />
          <span className="sr-only">検索</span>
        </SearchButton>
      </SearchRow>
      {autocompleteResults.length > 0 && (
        <AutocompleteList id="autocomplete-list" ref={autocompleteRef}>
          {autocompleteResults.map((item, index) => (
            <AutocompleteItem
              key={index}
              onClick={() => handleAutocompleteClick(item)}
              onMouseEnter={() => setSelectedAutocompleteIndex(index)}
              aria-selected={index === selectedAutocompleteIndex}
              id={`autocomplete-item-${index}`}
            >
              {item}
            </AutocompleteItem>
          ))}
        </AutocompleteList>
      )}
      <FilterToggle 
        onClick={() => setShowFilters(!showFilters)}
        aria-expanded={showFilters}
        aria-controls="filter-options"
      >
        <FaFilter />
        {showFilters ? "フィルターを隠す" : "詳細検索"}
      </FilterToggle>
      {showFilters && (
        <FilterOptions id="filter-options">
          <FilterSelect 
            name="category" 
            value={filters.category} 
            onChange={handleFilterChange}
            aria-label="カテゴリー"
          >
            <option value="">カテゴリー</option>
            <option value="music">音楽</option>
            <option value="sports">スポーツ</option>
            <option value="gaming">ゲーム</option>
            <option value="education">教育</option>
            <option value="science">科学と技術</option>
            <option value="entertainment">エンターテイメント</option>
          </FilterSelect>
          <FilterSelect 
            name="duration" 
            value={filters.duration} 
            onChange={handleFilterChange}
            aria-label="動画の長さ"
          >
            <option value="">動画の長さ</option>
            <option value="short">4分以下</option>
            <option value="medium">4〜20分</option>
            <option value="long">20分以上</option>
          </FilterSelect>
          <FilterSelect 
            name="uploadDate" 
            value={filters.uploadDate} 
            onChange={handleFilterChange}
            aria-label="アップロード日"
          >
            <option value="">アップロード日</option>
            <option value="hour">1時間以内</option>
            <option value="day">24時間以内</option>
            <option value="week">1週間以内</option>
            <option value="month">1ヶ月以内</option>
            <option value="year">1年以内</option>
          </FilterSelect>
          <FilterSelect 
            name="sortBy" 
            value={filters.sortBy} 
            onChange={handleFilterChange}
            aria-label="並び替え"
          >
            <option value="">並び替え</option>
            <option value="relevance">関連度</option>
            <option value="date">アップロード日</option>
            <option value="viewCount">視聴回数</option>
            <option value="rating">評価</option>
          </FilterSelect>
        </FilterOptions>
      )}
    </SearchForm>
  );
};

export default SearchBar;