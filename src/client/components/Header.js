import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import SearchBar from './SearchBar';

const HeaderContainer = styled.header`
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 15px 0;
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

const Logo = styled(Link)`
  font-size: 24px;
  font-weight: bold;
  color: #1a73e8;
  text-decoration: none;
`;

const Nav = styled.nav`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const NavLink = styled(Link)`
  color: #5f6368;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;

  &:hover {
    color: #1a73e8;
  }
`;

const Header = () => {
  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">MyTubeNavi</Logo>
        <SearchBar />
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