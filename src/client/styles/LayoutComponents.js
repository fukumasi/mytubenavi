import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const Container = styled.div`
  max-width: 1200px;
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
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const FormInput = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
`;

export const SubmitButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #155db1;
  }
`;

export const ErrorMessage = styled.p`
  color: #d32f2f;
  margin-bottom: 10px;
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const UserProfileContainer = styled.div`
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const UserAvatar = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
`;

export const HeaderContainer = styled.header`
  background-color: #f8f9fa;
  padding: 10px 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const Logo = styled(Link)`
  font-size: 24px;
  font-weight: bold;
  color: #333;
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
    background-color: #f8f9fa;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
`;

export const ThemeToggle = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  margin-right: 10px;
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
`;

export const UserMenuDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #ffffff;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: none;

  ${UserMenu}:hover & {
    display: block;
  }
`;

export const UserMenuLink = styled(Link)`
  display: block;
  padding: 10px;
  color: #333;
  text-decoration: none;

  &:hover {
    background-color: #f0f0f0;
  }
`;

export const NavLink = styled(Link)`
  color: #333;
  text-decoration: none;
  margin-left: 20px;

  &:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    margin: 10px 0;
  }
`;