import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar';
import { useAuth } from '../contexts/AuthContext';
import useTheme from '../hooks/useTheme';
import {
  HeaderContainer,
  HeaderContent,
  Logo,
  SearchBarWrapper,
  MobileMenuButton,
  Nav,
  ThemeToggle,
  UserMenu,
  UserMenuButton,
  UserMenuDropdown,
  UserMenuLink,
  NavLink
} from '../styles/LayoutComponents';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      setError('サインアウトに失敗しました。もう一度お試しください。');
    }
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">{t('appName')}</Logo>
        <SearchBarWrapper>
          <SearchBar onSearch={handleSearch} />
        </SearchBarWrapper>
        <MobileMenuButton onClick={toggleMenu}>
          {isMenuOpen ? '✕' : '☰'}
        </MobileMenuButton>
        <Nav $isOpen={isMenuOpen}>
          <ThemeToggle onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </ThemeToggle>
          {currentUser ? (
            <UserMenu>
              <UserMenuButton>
                {currentUser.displayName || currentUser.email}
              </UserMenuButton>
              <UserMenuDropdown>
                <UserMenuLink to="/profile">{t('profile')}</UserMenuLink>
                <UserMenuLink to="/edit-profile">{t('settings')}</UserMenuLink>
                <UserMenuLink as="button" onClick={handleSignOut}>
                  {t('signOut')}
                </UserMenuLink>
              </UserMenuDropdown>
            </UserMenu>
          ) : (
            <>
              <NavLink to="/login">{t('login')}</NavLink>
              <NavLink to="/register">{t('register')}</NavLink>
            </>
          )}
        </Nav>
      </HeaderContent>
      {error && <div className="error-message">{error}</div>}
    </HeaderContainer>
  );
};

export default Header;