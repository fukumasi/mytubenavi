import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import SearchBar from './SearchBar';

const HeaderContainer = styled.header`
  background-color: ${({ theme }) => theme.colors.background};
  box-shadow: 0 2px 4px ${({ theme }) => theme.colors.shadow};
  padding: ${({ theme }) => theme.spacing.medium} 0;
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: ${({ theme }) => theme.maxWidth};
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.medium};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.medium};
  }
`;

const Logo = styled(Link)`
  font-size: ${({ theme }) => theme.fontSize.large};
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
`;

const Nav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};
  align-items: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    width: 100%;
  }
`;

const NavLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">MyTubeNavi</Logo>
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSubmit={handleSearch}
        />
        <Nav>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/profile">プロフィール</NavLink>
        </Nav>
      </HeaderContent>
    </HeaderContainer>
  );
};

export default Header;