import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import { FaShieldAlt, FaKey } from 'react-icons/fa';
import { getAuth, multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";

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
  const [message, setMessage] = useState({ text: "", isError: false });
  const [error, setError] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const checkMfaStatus = async () => {
      if (user) {
        const isMultiFactorAuth = user.multiFactor.enrolledFactors.length > 0;
        setIsEnabled(isMultiFactorAuth);
        if (isMultiFactorAuth) {
          await fetchRecoveryCodes();
        }
      }
    };
    checkMfaStatus();
  }, [user]);

  const fetchRecoveryCodes = async () => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists() && userDocSnap.data().recoveryCodes) {
        setRecoveryCodes(userDocSnap.data().recoveryCodes);
      }
    } catch (error) {
      setError("リカバリーコードの取得に失敗しました。");
    }
  };

  const handleEnable2FA = async () => {
    try {
      setIsEnabling(true);
      setError("");
      setMessage({ text: "", isError: false });
      
      const session = await multiFactor(user).getSession();
      const phoneInfoOptions = {
        phoneNumber: user.phoneNumber,
        session
      };
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, auth);
      
      setQrCode('QR code placeholder');
      setSecret(verificationId);
      setMessage({ text: "QRコードをスキャンして確認コードを入力してください。", isError: false });
    } catch (error) {
      setError("2要素認証の設定開始中にエラーが発生しました。");
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setError("");
      setMessage({ text: "", isError: false });
      await multiFactor(user).unenroll(user.multiFactor.enrolledFactors[0].uid);
      setIsEnabled(false);
      setUser({ ...user, multiFactor: { enrolledFactors: [] } });
      setMessage({ text: "2要素認証が無効化されました。", isError: false });
      setRecoveryCodes([]);
      setShowRecoveryCodes(false);

      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { recoveryCodes: [] });
    } catch (error) {
      setError("2要素認証の無効化中にエラーが発生しました。");
    }
  };

  const handleVerification = async () => {
    try {
      setError("");
      setMessage({ text: "", isError: false });
      const cred = PhoneAuthProvider.credential(secret, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(user).enroll(multiFactorAssertion, "My Phone Number");
      setIsEnabled(true);
      setUser({ ...user, multiFactor: { enrolledFactors: [{ uid: "My Phone Number" }] } });
      setMessage({ text: "2要素認証が有効化されました。", isError: false });
      setQrCode('');
      setSecret('');
      await generateRecoveryCodes();
      setShowRecoveryCodes(true);
    } catch (error) {
      setError("確認コードが無効です。もう一度お試しください。");
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

  const generateRecoveryCodes = async () => {
    const newCodes = Array.from({ length: 10 }, () => Math.random().toString(36).substr(2, 8));
    setRecoveryCodes(newCodes);

    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { recoveryCodes: newCodes }, { merge: true });
  };

  const handleRegenerateRecoveryCodes = async () => {
    try {
      setIsRegenerating(true);
      setError("");
      setMessage({ text: "", isError: false });
      await generateRecoveryCodes();
      setMessage({ text: "リカバリーコードが再生成されました。", isError: false });
      setShowRecoveryCodes(true);
    } catch (error) {
      setError("リカバリーコードの再生成中にエラーが発生しました。");
    } finally {
      setIsRegenerating(false);
    }
  };

  const toggleRecoveryCodesVisibility = () => {
    setShowRecoveryCodes(!showRecoveryCodes);
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
          <h2>QRコード</h2>
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
          <h2>リカバリーコード</h2>
          <p>以下のリカバリーコードを安全な場所に保存してください。各コードは1回のみ使用できます。</p>
          <Button onClick={toggleRecoveryCodesVisibility}>
            {showRecoveryCodes ? "コードを隠す" : "コードを表示"}
          </Button>
          {showRecoveryCodes && (
            <RecoveryCodesList>
              {recoveryCodes.map((code, index) => (
                <RecoveryCode key={index}>{code}</RecoveryCode>
              ))}
            </RecoveryCodesList>
          )}
          <Button onClick={handleDownloadRecoveryCodes}>
            リカバリーコードをダウンロード
          </Button>
          <Button onClick={handleRegenerateRecoveryCodes} disabled={isRegenerating}>
            {isRegenerating ? '再生成中...' : 'リカバリーコードを再生成'}
          </Button>
        </RecoveryCodesContainer>
      )}

      {message.text && <Message error={message.isError}>{message.text}</Message>}
      {error && <Message error>{error}</Message>}

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