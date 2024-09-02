import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styled, { ThemeProvider, css } from "styled-components";
import SearchBar from "./SearchBar";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaMoon, FaSun, FaBars, FaTimes, FaAd, FaLock, FaTachometerAlt } from 'react-icons/fa';
import theme from "../styles/theme";

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

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-wrap: wrap;
  }
`;

const Logo = styled(Link)`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover, &:focus {
    color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};
  align-items: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: ${({ $isMobileMenuOpen }) => ($isMobileMenuOpen ? 'flex' : 'none')};
    flex-direction: column;
    width: 100%;
    padding: ${({ theme }) => theme.spacing.medium} 0;
    background-color: ${({ theme }) => theme.colors.background};
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    box-shadow: 0 4px 6px ${({ theme }) => theme.colors.shadow};
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
  padding: ${({ theme }) => theme.spacing.small};
  border-radius: ${({ theme }) => theme.borderRadius};

  &:hover, &:focus {
    color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: bold;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    padding: ${({ theme }) => theme.spacing.medium};
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
  transition: background-color 0.3s ease, transform 0.1s ease;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
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
  padding: ${({ theme }) => theme.spacing.small};
  border-radius: ${({ theme }) => theme.borderRadius};
  transition: background-color 0.3s ease;

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }
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
  z-index: 1001;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    position: static;
    width: 100%;
    box-shadow: none;
    border: none;
  }
`;

const UserMenuLink = styled(Link)`
  display: block;
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition: background-color 0.3s ease;

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing.medium};
  }
`;

const ThemeToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.medium};
  padding: ${({ theme }) => theme.spacing.small};
  border-radius: 50%;
  transition: background-color 0.3s ease;

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.large};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.small};
  border-radius: ${({ theme }) => theme.borderRadius};
  transition: background-color 0.3s ease;

  &:hover, &:focus {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: block;
  }
`;

const SearchBarWrapper = styled.div`
  flex-grow: 1;
  margin: 0 ${({ theme }) => theme.spacing.medium};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    order: 3;
    width: 100%;
    margin: ${({ theme }) => theme.spacing.medium} 0 0;
  }
`;

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(theme.light);
  const userMenuRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
      setIsUserMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <HeaderContainer>
        <HeaderContent>
          <Logo to="/">MyTubeNavi</Logo>
          <SearchBarWrapper>
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSubmit={handleSearch}
            />
          </SearchBarWrapper>
          <MobileMenuButton onClick={toggleMobileMenu} aria-label="Toggle menu">
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </MobileMenuButton>
          <Nav $isMobileMenuOpen={isMobileMenuOpen}>
            <ThemeToggle onClick={toggleTheme} aria-label="Toggle theme">
              {currentTheme === theme.light ? <FaMoon /> : <FaSun />}
            </ThemeToggle>
            {user ? (
              <UserMenu ref={userMenuRef}>
                <UserMenuButton onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                  <FaUser /> {user.username}
                </UserMenuButton>
                <UserMenuDropdown $isOpen={isUserMenuOpen}>
                  <UserMenuLink to="/dashboard" onClick={() => setIsUserMenuOpen(false)}>
                    <FaTachometerAlt /> ダッシュボード
                  </UserMenuLink>
                  <UserMenuLink to="/profile" onClick={() => setIsUserMenuOpen(false)}>
                    <FaUser /> プロフィール
                  </UserMenuLink>
                  <UserMenuLink to="/ad-management" onClick={() => setIsUserMenuOpen(false)}>
                    <FaAd /> 広告管理
                  </UserMenuLink>
                  <UserMenuLink to="/two-factor-auth" onClick={() => setIsUserMenuOpen(false)}>
                    <FaLock /> 2要素認証設定
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

// 将来的な機能拡張のためのコメント
// TODO: 多言語対応の実装
// TODO: ユーザー設定ページへのリンク追加
// TODO: 通知機能の実装
// TODO: ヘッダーのレスポンシブデザインの改善
// TODO: ダークモード設定の永続化
// TODO: ユーザーアバターの表示
// TODO: 検索履歴の実装
// TODO: ヘッダーのアニメーション効果の追加