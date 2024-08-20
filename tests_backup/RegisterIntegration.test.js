import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import Login from '../../src/client/pages/Login';
import { AuthProvider } from '../../src/client/contexts/AuthContext';
import { SettingsProvider } from '../../src/client/contexts/SettingsContext';

const queryClient = new QueryClient();

const renderApp = (initialEntries = ['/login']) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Login />
          </MemoryRouter>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Login Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form', async () => {
    renderApp();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getAllByText('ログイン')[0]).toBeInTheDocument();
  });

  it('submits login form with valid credentials', async () => {
    renderApp();
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getAllByText('ログイン')[0]);

    await waitFor(() => {
      expect(screen.getByText('ログイン成功')).toBeInTheDocument();
    });
  });

  it('displays error message for invalid credentials', async () => {
    renderApp();
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getAllByText('ログイン')[0]);

    await waitFor(() => {
      expect(screen.getByText('ログインに失敗しました')).toBeInTheDocument();
    });
  });

  it('navigates to forgot password page', async () => {
    renderApp();
    fireEvent.click(screen.getByText('パスワードをお忘れですか？'));

    await waitFor(() => {
      expect(screen.getByText('パスワード再設定')).toBeInTheDocument();
    });
  });

  it('navigates to registration page', async () => {
    renderApp();
    fireEvent.click(screen.getByText((content) => content.includes('アカウントをお持ちでない方はこちら')));

    await waitFor(() => {
      expect(screen.getByText('新規アカウント登録')).toBeInTheDocument();
    });
  });
});
