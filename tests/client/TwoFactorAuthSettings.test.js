import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TwoFactorAuthSettings from '../../src/client/pages/TwoFactorAuthSettings';
import { useAuth } from '../../src/client/contexts/AuthContext';
import api from '../../src/client/utils/api';

// AuthContextのモック
jest.mock('../../src/client/contexts/AuthContext');

// apiのモック
jest.mock('../../src/client/utils/api');

describe('TwoFactorAuthSettings', () => {
  const mockUser = {
    isTwoFactorEnabled: false,
  };

  const mockSetUser = jest.fn();

  beforeEach(() => {
    useAuth.mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
    });
  });

  it('renders the component', () => {
    render(<TwoFactorAuthSettings />);
    expect(screen.getByText('2要素認証設定')).toBeInTheDocument();
  });

  it('enables 2FA when button is clicked', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        qrCode: 'mockQRCode',
        secret: 'mockSecret',
      },
    });

    render(<TwoFactorAuthSettings />);
    
    fireEvent.click(screen.getByText('2要素認証を有効にする'));

    await waitFor(() => {
      expect(screen.getByAltText('2要素認証QRコード')).toBeInTheDocument();
      expect(screen.getByText('mockSecret')).toBeInTheDocument();
    });
  });

  it('disables 2FA when button is clicked', async () => {
    mockUser.isTwoFactorEnabled = true;
    api.post.mockResolvedValueOnce({
      data: {
        message: '2要素認証が無効化されました',
      },
    });

    render(<TwoFactorAuthSettings />);
    
    fireEvent.click(screen.getByText('2要素認証を無効にする'));

    await waitFor(() => {
      expect(screen.getByText('2要素認証が無効化されました')).toBeInTheDocument();
      expect(mockSetUser).toHaveBeenCalledWith({ ...mockUser, isTwoFactorEnabled: false });
    });
  });

  it('fetches recovery codes when 2FA is enabled', async () => {
    mockUser.isTwoFactorEnabled = true;
    api.get.mockResolvedValueOnce({
      data: {
        recoveryCodes: ['code1', 'code2', 'code3'],
      },
    });

    render(<TwoFactorAuthSettings />);

    await waitFor(() => {
      expect(screen.getByText('code1')).toBeInTheDocument();
      expect(screen.getByText('code2')).toBeInTheDocument();
      expect(screen.getByText('code3')).toBeInTheDocument();
    });
  });

  it('regenerates recovery codes when button is clicked', async () => {
    mockUser.isTwoFactorEnabled = true;
    api.post.mockResolvedValueOnce({
      data: {
        recoveryCodes: ['newCode1', 'newCode2', 'newCode3'],
      },
    });

    render(<TwoFactorAuthSettings />);

    fireEvent.click(screen.getByText('リカバリーコードを再生成'));

    await waitFor(() => {
      expect(screen.getByText('newCode1')).toBeInTheDocument();
      expect(screen.getByText('newCode2')).toBeInTheDocument();
      expect(screen.getByText('newCode3')).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    api.post.mockRejectedValueOnce(new Error('API Error'));

    render(<TwoFactorAuthSettings />);
    
    fireEvent.click(screen.getByText('2要素認証を有効にする'));

    await waitFor(() => {
      expect(screen.getByText('2要素認証の設定開始中にエラーが発生しました。')).toBeInTheDocument();
    });
  });
});