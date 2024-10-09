import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const MainContent = styled.main`
  min-height: calc(100vh - 120px);
  padding: 20px 0;
`;

export const AuthContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: 8px;
  box-shadow: 0 2px 4px ${({ theme }) => theme.colors.shadow};
`;

export const FormInput = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  color: ${({ theme }) => theme.colors.text};
`;

export const SubmitButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

export const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin-bottom: 10px;
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 3px solid ${({ theme }) => theme.colors.backgroundLight};
  border-top: 3px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const UserProfileContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px ${({ theme }) => theme.colors.shadow};
`;

export const UserAvatar = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
`;

export const HeaderContainer = styled.header`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 10px 0;
  box-shadow: 0 2px 4px ${({ theme }) => theme.colors.shadow};
`;

export const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const Logo = styled(Link)`
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
`;

export const SearchBarWrapper = styled.div`
  flex-grow: 1;
  margin: 0 20px;
`;

export const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};

  @media (max-width: 768px) {
    display: block;
  }
`;

export const Nav = styled.nav`
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: ${({ theme }) => theme.colors.background};
    padding: 20px;
    box-shadow: 0 2px 4px ${({ theme }) => theme.colors.shadow};
  }
`;

export const ThemeToggle = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  margin-right: 10px;
  color: ${({ theme }) => theme.colors.text};
`;

export const UserMenu = styled.div`
  position: relative;
`;

export const UserMenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text};
`;

export const UserMenuDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  box-shadow: 0 2px 4px ${({ theme }) => theme.colors.shadow};
  display: none;

  ${UserMenu}:hover & {
    display: block;
  }
`;

export const UserMenuLink = styled(Link)`
  display: block;
  padding: 10px;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  &:hover {
    background-color: ${({ theme }) => theme.colors.hover};
  }
`;

export const NavLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  margin-left: 20px;

  &:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    margin: 10px 0;
  }
`;

export const AdSpaceContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
`;