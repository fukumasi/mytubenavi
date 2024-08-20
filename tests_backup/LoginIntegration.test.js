import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createMemoryHistory } from 'history';
import AppWrapper from '../../src/client/AppWrapper';
import axios from 'axios';
import { createMemoryHistory } from 'history';

jest.mock('axios');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderApp = (initialEntries = ['/login']) => {
  const history = createMemoryHistory({ initialEntries });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppWrapper history={history} />
    </QueryClientProvider>
  );
};

describe('Login Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({ data: { token: 'fake-token', user: { id: '1', username: 'testuser' } } });
  });

  it('successfully logs in with valid credentials', async () => {
    renderApp();
    await waitFor(() => screen.getByRole('heading', { name: 'ログイン' }));

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('ログインに成功しました')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays error message for invalid credentials', async () => {
    axios.post.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderApp();
    await waitFor(() => screen.getByRole('heading', { name: 'ログイン' }));

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText(/ログインに失敗しました/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('validates form inputs', async () => {
    renderApp();
    await waitFor(() => screen.getByRole('heading', { name: 'ログイン' }));

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument();
      expect(screen.getByText('パスワードは必須です')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('navigates to forgot password page', async () => {
    renderApp();
    await waitFor(() => screen.getByRole('heading', { name: 'ログイン' }));

    const forgotPasswordLink = screen.getByText(/パスワードをお忘れ/);
    fireEvent.click(forgotPasswordLink);

    await waitFor(() => {
      expect(screen.getByText(/パスワード再設定/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('navigates to registration page', async () => {
    renderApp();
    await waitFor(() => screen.getByRole('heading', { name: 'ログイン' }));

    const registerLink = screen.getByText(/アカウントをお持ちでない/);
    fireEvent.click(registerLink);

    await waitFor(() => {
      expect(screen.getByText(/新規登録/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});