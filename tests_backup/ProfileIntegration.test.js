import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from 'styled-components';
import Profile from '../../src/client/pages/Profile';
import { AuthProvider } from '../../src/client/contexts/AuthContext';
import { SettingsProvider } from '../../src/client/contexts/SettingsContext';
import theme from '../../src/client/styles/theme';
import axios from 'axios';

jest.mock('axios');
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderProfile = () => {
  return render(
    <ThemeProvider theme={theme.light}>
      <MemoryRouter initialEntries={['/profile']}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SettingsProvider>
              <Profile />
            </SettingsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Profile Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        avatar: 'avatar.jpg',
        bio: 'Test bio',
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: true
        },
        socialLinks: {
          twitter: 'https://twitter.com/johndoe',
          instagram: 'https://instagram.com/johndoe',
          youtube: 'https://youtube.com/johndoe'
        }
      },
    });
    axios.put.mockResolvedValue({ data: { message: 'Profile updated successfully' } });
    axios.post.mockResolvedValue({ data: { avatar: 'new-avatar.jpg' } });
  });

  it('loads and displays user profile', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.getByLabelText('名')).toHaveValue('John');
      expect(screen.getByLabelText('姓')).toHaveValue('Doe');
      expect(screen.getByLabelText('自己紹介')).toHaveValue('Test bio');
      expect(screen.getByLabelText('Twitter URL')).toHaveValue('https://twitter.com/johndoe');
    });
  });

  it('updates profile information', async () => {
    renderProfile();
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('名'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByLabelText('姓'), { target: { value: 'Smith' } });
      fireEvent.change(screen.getByLabelText('自己紹介'), { target: { value: 'Updated bio' } });
    });
    fireEvent.click(screen.getByText('プロフィールを更新'));
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/users/profile', expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Updated bio'
      }));
      expect(screen.getByText('プロフィールが正常に更新されました')).toBeInTheDocument();
    });
  });

  it('uploads new avatar', async () => {
    renderProfile();
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    
    await waitFor(() => {
      const input = screen.getByLabelText('画像をアップロード');
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/users/avatar', expect.any(FormData), expect.any(Object));
      expect(screen.getByText('プロフィール画像が正常に更新されました')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    axios.put.mockRejectedValueOnce(new Error('Network error'));
    renderProfile();
    await waitFor(() => {
      fireEvent.click(screen.getByText('プロフィールを更新'));
    });
    await waitFor(() => {
      expect(screen.getByText('プロフィールの更新中にエラーが発生しました')).toBeInTheDocument();
    });
  });

  it('updates user preferences', async () => {
    renderProfile();
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('テーマ'), { target: { value: 'dark' } });
      fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'ja' } });
      fireEvent.click(screen.getByLabelText('通知設定'));
    });
    fireEvent.click(screen.getByText('プロフィールを更新'));
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/users/profile', expect.objectContaining({
        preferences: {
          theme: 'dark',
          language: 'ja',
          notifications: false
        }
      }));
    });
  });

  it('validates form inputs', async () => {
    renderProfile();
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('名'), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText('Twitter URL'), { target: { value: 'invalid-url' } });
    });
    fireEvent.click(screen.getByText('プロフィールを更新'));
    await waitFor(() => {
      expect(screen.getByText('名前は必須です')).toBeInTheDocument();
      expect(screen.getByText('有効なTwitter URLを入力してください')).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));
    renderProfile();
    await waitFor(() => {
      expect(screen.getByText('プロフィールの読み込み中にエラーが発生しました')).toBeInTheDocument();
    });
  });
});