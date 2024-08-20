/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Header from '../../src/client/components/Header';
import { ThemeProvider } from 'styled-components';
import theme from '../../src/client/styles/theme';

jest.mock('../../src/client/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'testuser' },
    logout: jest.fn(),
  }),
}));

jest.mock('react-icons/fa', () => ({
  FaMoon: () => 'MoonIcon',
  FaSun: () => 'SunIcon',
  FaUser: () => 'UserIcon',
  FaSignOutAlt: () => 'SignOutIcon',
  FaSignInAlt: () => 'SignInIcon',
  FaUserPlus: () => 'UserPlusIcon',
}));

beforeEach(() => {
  jest.clearAllMocks(); // すべてのモック関数をクリア
});

describe('Header Component', () => {
  test('renders Header component', () => {
    const { getByText } = render(
      <Router>
        <ThemeProvider theme={theme.light}>
          <Header />
        </ThemeProvider>
      </Router>
    );
    expect(getByText('MoonIcon')).toBeInTheDocument();
  });
});
