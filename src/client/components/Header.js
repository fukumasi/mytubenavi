import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
      setError(t('signOutError') || 'Sign out error');
    }
  };

  const renderUserMenu = () => {
    if (currentUser) {
      return (
        <UserMenu>
          <UserMenuButton>
            {currentUser.displayName || currentUser.email}
          </UserMenuButton>
          <UserMenuDropdown>
            <UserMenuLink to="/profile">{t('profile') || 'Profile'}</UserMenuLink>
            <UserMenuLink to="/edit-profile">{t('settings') || 'Settings'}</UserMenuLink>
            <UserMenuLink as="button" onClick={handleSignOut}>
              {t('signOut') || 'Sign Out'}
            </UserMenuLink>
          </UserMenuDropdown>
        </UserMenu>
      );
    }
    return (
      <>
        <NavLink to="/login">{t('login') || 'Login'}</NavLink>
        <NavLink to="/register">{t('register') || 'Register'}</NavLink>
      </>
    );
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">{t('app.title') || 'MyTubeNavi'}</Logo>
        <SearchBarWrapper>
          <SearchBar onSearch={handleSearch} />
        </SearchBarWrapper>
        <MobileMenuButton onClick={toggleMenu}>
          {isMenuOpen ? '✕' : '☰'}
        </MobileMenuButton>
        <Nav $isOpen={isMenuOpen}>
          <ThemeToggle onClick={toggleTheme}>
            {theme.name === 'light' ? (t('darkTheme') || 'Dark Theme') : (t('lightTheme') || 'Light Theme')}
          </ThemeToggle>
          {renderUserMenu()}
        </Nav>
      </HeaderContent>
      {error && <div role="alert">{error}</div>}
    </HeaderContainer>
  );
};

export default Header;