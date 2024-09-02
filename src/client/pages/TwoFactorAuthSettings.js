import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import styled from 'styled-components';
import { FaQrcode, FaKey, FaShieldAlt, FaExclamationTriangle, FaDownload, FaSync } from 'react-icons/fa';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Button = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 10px;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${props => props.theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const QRCodeContainer = styled.div`
  margin-top: 20px;
  background-color: ${props => props.theme.colors.backgroundLight};
  padding: 20px;
  border-radius: 5px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 5px;
`;

const Message = styled.p`
  color: ${props => props.error ? props.theme.colors.error : props.theme.colors.success};
  display: flex;
  align-items: center;
  gap: 5px;
`;

const InfoText = styled.p`
  margin-top: 20px;
  line-height: 1.5;
`;

const SecretKey = styled.span`
  font-family: monospace;
  background-color: ${props => props.theme.colors.backgroundLight};
  padding: 2px 4px;
  border-radius: 3px;
`;

const RecoveryCodesContainer = styled.div`
  margin-top: 20px;
  background-color: ${props => props.theme.colors.backgroundLight};
  padding: 20px;
  border-radius: 5px;
`;

const RecoveryCodesList = styled.ul`
  list-style-type: none;
  padding: 0;
  margin: 0;
  font-family: monospace;
`;

const RecoveryCode = styled.li`
  margin-bottom: 5px;
`;

const TwoFactorAuthSettings = () => {
  const { user, setUser } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  useEffect(() => {
    if (user) {
      setIsEnabled(user.isTwoFactorEnabled);
      if (user.isTwoFactorEnabled) {
        fetchRecoveryCodes();
      }
    }
  }, [user]);

  const fetchRecoveryCodes = async () => {
    try {
      const response = await api.get('/auth/recovery-codes');
      if (response.data.recoveryCodes) {
        setRecoveryCodes(response.data.recoveryCodes);
      }
    } catch (error) {
      setError('リカバリーコードの取得に失敗しました。');
    }
  };

  const handleEnable2FA = async () => {
    try {
      setIsEnabling(true);
      setError('');
      setMessage('');
      const response = await api.post('/auth/enable-2fa');
      if (response.data.qrCode && response.data.secret) {
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setMessage('QRコードをスキャンして確認コードを入力してください。');
      } else {
        setError('2要素認証の設定開始に失敗しました。');
      }
    } catch (error) {
      setError('2要素認証の設定開始中にエラーが発生しました。');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setError('');
      setMessage('');
      const response = await api.post('/auth/disable-2fa');
      if (response.data.message) {
        setIsEnabled(false);
        setUser({ ...user, isTwoFactorEnabled: false });
        setMessage(response.data.message);
        setRecoveryCodes([]);
      } else {
        setError('2要素認証の無効化に失敗しました。');
      }
    } catch (error) {
      setError('2要素認証の無効化中にエラーが発生しました。');
    }
  };

  const handleVerification = async () => {
    try {
      setError('');
      setMessage('');
      const response = await api.post('/auth/verify-2fa', { verificationCode });
      if (response.data.message) {
        setIsEnabled(true);
        setUser({ ...user, isTwoFactorEnabled: true });
        setMessage(response.data.message);
        setQrCode('');
        setSecret('');
        fetchRecoveryCodes(); // リカバリーコードを取得
      } else {
        setError('2要素認証の確認に失敗しました。');
      }
    } catch (error) {
      setError('確認コードが無効です。もう一度お試しください。');
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery_codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegenerateRecoveryCodes = async () => {
    try {
      setIsRegenerating(true);
      setError('');
      setMessage('');
      const response = await api.post('/auth/regenerate-recovery-codes');
      if (response.data.recoveryCodes) {
        setRecoveryCodes(response.data.recoveryCodes);
        setMessage('リカバリーコードが再生成されました。');
      } else {
        setError('リカバリーコードの再生成に失敗しました。');
      }
    } catch (error) {
      setError('リカバリーコードの再生成中にエラーが発生しました。');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Container>
      <Title><FaShieldAlt /> 2要素認証設定</Title>
      {isEnabled ? (
        <Button onClick={handleDisable2FA}>
          <FaKey /> 2要素認証を無効にする
        </Button>
      ) : (
        <Button onClick={handleEnable2FA} disabled={isEnabling}>
          {isEnabling ? '処理中...' : <><FaKey /> 2要素認証を有効にする</>}
        </Button>
      )}

      {qrCode && (
        <QRCodeContainer>
          <h2><FaQrcode /> QRコード</h2>
          <img src={qrCode} alt="2要素認証QRコード" />
          <p>シークレットキー: <SecretKey>{secret}</SecretKey></p>
          <Input
            type="text"
            placeholder="確認コードを入力"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            aria-label="確認コード"
          />
          <Button onClick={handleVerification}>確認</Button>
        </QRCodeContainer>
      )}

      {isEnabled && recoveryCodes.length > 0 && (
        <RecoveryCodesContainer>
          <h2><FaKey /> リカバリーコード</h2>
          <p>以下のリカバリーコードを安全な場所に保存してください。各コードは1回のみ使用できます。</p>
          <RecoveryCodesList>
            {recoveryCodes.map((code, index) => (
              <RecoveryCode key={index}>{code}</RecoveryCode>
            ))}
          </RecoveryCodesList>
          <Button onClick={handleDownloadRecoveryCodes}>
            <FaDownload /> リカバリーコードをダウンロード
          </Button>
          <Button onClick={handleRegenerateRecoveryCodes} disabled={isRegenerating}>
            <FaSync /> {isRegenerating ? '再生成中...' : 'リカバリーコードを再生成'}
          </Button>
        </RecoveryCodesContainer>
      )}

      {message && <Message><FaShieldAlt /> {message}</Message>}
      {error && <Message error><FaExclamationTriangle /> {error}</Message>}

      <InfoText>
        2要素認証を有効にすると、ログイン時にスマートフォンなどの認証アプリで生成された
        コードの入力が必要になります。これにより、アカウントのセキュリティが向上します。
      </InfoText>
      <InfoText>
        推奨アプリ: Google Authenticator, Authy, Microsoft Authenticator
      </InfoText>
      <InfoText>
        <strong>重要:</strong> 2要素認証を有効にした後は、必ずリカバリーコードをダウンロードして
        安全な場所に保管してください。デバイスを紛失した場合でもアカウントにアクセスできるようになります。
      </InfoText>
      <InfoText>
        リカバリーコードは一度しか使用できません。使用後は新しいコードが生成されます。
        定期的にリカバリーコードを再生成し、最新の状態を維持することをお勧めします。
      </InfoText>
    </Container>
  );
};

export default TwoFactorAuthSettings;