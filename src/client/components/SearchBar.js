import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const SearchForm = styled.form`
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
  width: 300px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #1a73e8;
  }
`;

const SearchButton = styled.button`
  padding: 8px 16px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #1555b3;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.4);
  }
`;

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm(""); // 検索後に検索バーをクリア
    }
  };

  return (
    <SearchForm onSubmit={handleSubmit} role="search">
      <label htmlFor="search-input" className="sr-only">
        動画を検索
      </label>
      <SearchInput
        id="search-input"
        type="search"
        placeholder="動画を検索..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="動画を検索"
      />
      <SearchButton type="submit" aria-label="検索を実行">
        検索
      </SearchButton>
    </SearchForm>
  );
};

export default SearchBar;
