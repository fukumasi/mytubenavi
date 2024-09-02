import React from 'react';
import styled from 'styled-components';
import SearchBar from './SearchBar';
import GenreSelector from './GenreSelector';

const SidebarContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: 20px;
  background-color: ${props => props.theme.sidebar.background};
  border-right: 1px solid ${props => props.theme.sidebar.border};
  overflow-y: auto;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 15px;
  color: ${props => props.theme.colors.text};
`;

const LeftSidebar = () => {
  return (
    <SidebarContainer>
      <SectionTitle>検索</SectionTitle>
      <SearchBar />
      <SectionTitle>ジャンル</SectionTitle>
      <GenreSelector />
    </SidebarContainer>
  );
};

export default LeftSidebar;