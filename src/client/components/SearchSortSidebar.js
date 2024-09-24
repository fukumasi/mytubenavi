import React, { useState } from "react";
import styled from "styled-components";
import SearchBar from "./SearchBar";

const SidebarContainer = styled.div`
  padding: 20px;
`;

const SortContainer = styled.div`
  margin-top: 20px;
`;

const SortSelect = styled.select`
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
`;

const SearchSortSidebar = ({ onSearch, onSort }) => {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const handleSortChange = (e) => {
    onSort(e.target.value);
  };

  return (
    <SidebarContainer>
      <SearchBar
        value={searchValue}
        onChange={handleSearchChange}
        onSubmit={handleSearchSubmit}
      />
      <SortContainer>
        <SortSelect onChange={handleSortChange}>
          <option value="">並び替え</option>
          <option value="newest">最新順</option>
          <option value="popular">人気順</option>
          <option value="rating">評価順</option>
        </SortSelect>
      </SortContainer>
    </SidebarContainer>
  );
};

export default SearchSortSidebar;