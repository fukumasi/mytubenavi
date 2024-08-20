import React from 'react';
import { render } from '@testing-library/react';
import App from '../../src/client/App';
import { ThemeProvider } from 'styled-components';
import theme from '../../src/client/styles/theme';

// useAuth フックをモック
jest.mock('../../src/client/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },  // テスト用のユーザーデータ
    logout: jest.fn(),            // モックされたlogout関数
  }),
}));

describe('App Component', () => {
  it('renders App with Header and Home components', () => {
    render(
      <ThemeProvider theme={theme.light}>
        <App />
      </ThemeProvider>
    );
    // 他のアサーション
  });
});
