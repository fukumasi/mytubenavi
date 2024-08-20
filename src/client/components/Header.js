import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled, { ThemeProvider, css } from "styled-components";
import SearchBar from "./SearchBar";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaMoon, FaSun } from 'react-icons/fa';
import theme from "../styles/theme"; // テーマのインポート

const HeaderContainer = styled.header`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
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
  font-size: ${({ theme }) => theme.fontSizes.large};
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
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.background};
  border: none;
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const UserMenu = styled.div`
  position: relative;
`;

const UserMenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const UserMenuDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
`;

const UserMenuLink = styled(Link)`
  display: block;
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition: background-color 0.3s ease;
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }
`;

const ThemeToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.medium};
  padding: ${({ theme }) => theme.spacing.small};
`;

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(theme.light);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleTheme = () => {
    setCurrentTheme((prevTheme) =>
      prevTheme === theme.light ? theme.dark : theme.light
    );
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <HeaderContainer>
        <HeaderContent>
          <Logo to="/">MyTubeNavi</Logo>
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSubmit={handleSearch}
          />
          <Nav>
            <ThemeToggle onClick={toggleTheme}>
              {currentTheme === theme.light ? <FaMoon /> : <FaSun />}
            </ThemeToggle>
            {user ? (
              <UserMenu>
                <UserMenuButton onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                  <FaUser /> {user.username}
                </UserMenuButton>
                <UserMenuDropdown $isOpen={isUserMenuOpen}>
                  <UserMenuLink to="/profile" onClick={() => setIsUserMenuOpen(false)}>
                    <FaUser /> プロフィール
                  </UserMenuLink>
                  <UserMenuLink as="button" onClick={handleLogout}>
                    <FaSignOutAlt /> ログアウト
                  </UserMenuLink>
                </UserMenuDropdown>
              </UserMenu>
            ) : (
              <>
                <NavLink to="/login"><FaSignInAlt /> ログイン</NavLink>
                <NavLink to="/register"><FaUserPlus /> 登録</NavLink>
              </>
            )}
          </Nav>
        </HeaderContent>
      </HeaderContainer>
    </ThemeProvider>
  );
};

export default Header;
