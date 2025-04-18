// src/components/profile/PhoneVerification.tsx

import React, { useState, useEffect, useRef } from 'react';
import { verificationService } from '@/services/verificationService';
import { AlertTriangle, Shield, Smartphone, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

// 電話番号検証のステップを定義
enum VerificationStep {
  INPUT_PHONE,      // 電話番号入力
  VERIFICATION_CODE, // 認証コード入力
  COMPLETED,        // 完了
}

interface PhoneVerificationProps {
  onVerificationComplete?: () => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({ onVerificationComplete }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<VerificationStep>(VerificationStep.INPUT_PHONE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recaptchaResolved, setRecaptchaResolved] = useState<boolean>(false);
  const [isRecaptchaVisible, setIsRecaptchaVisible] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [verifiedPhone, setVerifiedPhone] = useState<string>('');
  
  // reCAPTCHAコンテナのref
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  // タイマー用ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // コンポーネントロード時にユーザーの認証状態を確認
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const verificationState = await verificationService.getVerificationState();
        
        if (verificationState && verificationState.phoneVerified) {
          setCurrentStep(VerificationStep.COMPLETED);
          // 電話番号が保存されている場合は表示用に設定
          if (verificationState.phoneNumber) {
            setVerifiedPhone(verificationState.phoneNumber);
          }
        }
      } catch (error) {
        console.error('認証状態の確認に失敗しました:', error);
      }
    };
    
    checkVerificationStatus();
  }, []);

  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // タイマーの設定（認証コード送信後）
  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // タイマー終了時にインターバルをクリア
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining]);

  // 電話番号の形式バリデーション
  const validatePhoneNumber = (phone: string): boolean => {
    // 日本の電話番号形式にマッチする正規表現
    // 090, 080, 070などの携帯電話番号と、市外局番付きの固定電話番号に対応
    const mobilePattern = /^0[789]0\d{8}$/;
    const landlinePattern = /^0\d{9,10}$/;
    
    // 国際形式（+81）もサポート
    const internationalPattern = /^\+81[789]0\d{8}$/;
    const internationalLandlinePattern = /^\+81\d{9,10}$/;
    
    return (
      mobilePattern.test(phone) || 
      landlinePattern.test(phone) || 
      internationalPattern.test(phone) || 
      internationalLandlinePattern.test(phone)
    );
  };

  // 電話番号のフォーマット（表示用）
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // 国際形式の場合
    if (phone.startsWith('+81')) {
      // +81 90-1234-5678 形式に変換
      const national = phone.substring(3); // +81を除去
      if (national.length === 10) { // 携帯電話
        return `+81 ${national.substring(0, 2)}-${national.substring(2, 6)}-${national.substring(6)}`;
      }
      // その他の形式はそのまま返す
      return `+81 ${national}`;
    }
    
    // 国内形式の場合
    if (phone.length === 11 && phone.startsWith('0')) { // 携帯電話
      return `${phone.substring(0, 3)}-${phone.substring(3, 7)}-${phone.substring(7)}`;
    }
    
    // その他の形式（固定電話など）はそのまま返す
    return phone;
  };

  // 検証コードのバリデーション
  const validateVerificationCode = (code: string): boolean => {
    // 6桁の数字であることを確認
    return /^\d{6}$/.test(code);
  };
  
  // reCAPTCHAを表示する
  const showRecaptcha = () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage('有効な日本の電話番号を入力してください');
      return;
    }
    
    setIsRecaptchaVisible(true);
    setErrorMessage('');
    
    // 少し遅延させてから表示（DOMが完全に更新されるのを待つ）
    setTimeout(() => {
      try {
        if (recaptchaContainerRef.current) {
          // reCAPTCHAを初期化
          verificationService.initRecaptcha('recaptcha-container')
            .then(() => {
              console.log('reCAPTCHA initialized successfully');
              setRecaptchaResolved(true);
            })
            .catch((error) => {
              console.error('reCAPTCHA initialization error:', error);
              setErrorMessage('reCAPTCHAの初期化に失敗しました。ページを再読み込みして再試行してください。');
              setIsRecaptchaVisible(false);
            });
        }
      } catch (error) {
        console.error('Error initializing recaptcha:', error);
        setErrorMessage('reCAPTCHAの初期化に失敗しました。ページを再読み込みして再試行してください。');
        setIsRecaptchaVisible(false);
      }
    }, 100);
  };

  // 電話番号認証コードの送信
  const handleSendVerificationCode = async () => {
    setErrorMessage('');
    
    // 電話番号のバリデーション
    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage('有効な日本の電話番号を入力してください');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 電話番号認証コードを送信
      const success = await verificationService.sendVerificationCode(
        phoneNumber,
        'recaptcha-container'
      );
      
      if (success) {
        setCurrentStep(VerificationStep.VERIFICATION_CODE);
        // SMS送信後の待機時間を設定（60秒）
        setTimeRemaining(60);
        // トーストで通知
        toast.success(`${formatPhoneNumber(phoneNumber)}に6桁の認証コードを送信しました`);
      } else {
        setErrorMessage('認証コードの送信に失敗しました。もう一度お試しください。');
        setIsRecaptchaVisible(false);
        setRecaptchaResolved(false);
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      // Firebaseのエラーコードによる詳細なエラーメッセージ
      let errorMsg = 'エラーが発生しました。もう一度お試しください。';
      
      if (error?.code) {
        switch (error.code) {
          case 'auth/invalid-phone-number':
            errorMsg = '電話番号の形式が正しくありません。';
            break;
          case 'auth/quota-exceeded':
            errorMsg = 'SMSの送信制限に達しました。しばらく時間をおいてから再試行してください。';
            break;
          case 'auth/captcha-check-failed':
            errorMsg = 'reCAPTCHA認証に失敗しました。もう一度試してください。';
            break;
          case 'auth/network-request-failed':
            errorMsg = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            break;
          default:
            errorMsg = `認証エラー: ${error.message || '不明なエラー'}`;
        }
      }
      
      setErrorMessage(errorMsg);
      setIsRecaptchaVisible(false);
      setRecaptchaResolved(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 認証コードの再送信
  const handleResendCode = async () => {
    if (timeRemaining > 0) return;
    
    setErrorMessage('');
    setIsLoading(true);
    
    try {
      // reCAPTCHAを再初期化
      setIsRecaptchaVisible(true);
      
      if (recaptchaContainerRef.current) {
        await verificationService.initRecaptcha('recaptcha-container');
        setRecaptchaResolved(true);
      }
      
      // 認証コードを再送信
      const success = await verificationService.sendVerificationCode(
        phoneNumber,
        'recaptcha-container'
      );
      
      if (success) {
        // 再送信の待機時間を設定（90秒に延長）
        setTimeRemaining(90);
        toast.success(`認証コードを再送信しました`);
      } else {
        setErrorMessage('認証コードの再送信に失敗しました。もう一度お試しください。');
      }
    } catch (error: any) {
      console.error('Error resending verification code:', error);
      
      let errorMsg = '再送信中にエラーが発生しました。';
      if (error?.code === 'auth/too-many-requests') {
        errorMsg = 'リクエストが多すぎます。しばらく時間をおいてから再試行してください。';
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
      setIsRecaptchaVisible(false);
    }
  };

  // 認証コードの確認
  const handleVerifyCode = async () => {
    setErrorMessage('');
    
    // 認証コードのバリデーション
    if (!validateVerificationCode(verificationCode)) {
      setErrorMessage('6桁の認証コードを入力してください');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 認証コードを確認
      const success = await verificationService.verifyCode(verificationCode);
      
      if (success) {
        // 認証に成功した電話番号を保存
        setVerifiedPhone(phoneNumber);
        setCurrentStep(VerificationStep.COMPLETED);
        
        // トーストで通知
        toast.success('電話番号の認証が完了しました。20ポイントが付与されました！', {
          duration: 5000,
          icon: '🎉',
        });
        
        // 認証完了のコールバックがあれば実行
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        setErrorMessage('認証に失敗しました。正しい認証コードを入力してください。');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      
      let errorMsg = 'エラーが発生しました。もう一度お試しください。';
      if (error?.code === 'auth/invalid-verification-code') {
        errorMsg = '無効な認証コードです。正確に入力してください。';
      } else if (error?.code === 'auth/code-expired') {
        errorMsg = '認証コードの有効期限が切れました。新しいコードを送信してください。';
        // コードが期限切れなら再送信できるようにする
        setTimeRemaining(0);
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ステップに応じたレンダリング
  const renderVerificationStep = () => {
    switch (currentStep) {
      case VerificationStep.INPUT_PHONE:
        return (
          <div className="card">
            <div className="card-header mb-6">
              <h5 className="card-title text-lg font-bold flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-blue-500" />
                電話番号認証
              </h5>
              <p className="card-description text-gray-600 mt-2">
                アカウントに電話番号を登録して認証すると、メッセージ機能やマッチング機能が利用可能になります。認証完了後は<span className="font-semibold">20ポイント</span>が付与されます。
              </p>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="phone-number" className="block text-sm font-medium">電話番号</label>
                  <div className="relative">
                    <input
                      id="phone-number"
                      className="w-full p-2 pl-10 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 focus:outline-none"
                      placeholder="例: 09012345678"
                      value={phoneNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setPhoneNumber(e.target.value);
                        // 入力が変わったらリセット
                        setIsRecaptchaVisible(false);
                        setRecaptchaResolved(false);
                      }}
                      disabled={isLoading || isRecaptchaVisible}
                      type="tel"
                      maxLength={13} // +819012345678の形式を考慮
                      aria-label="電話番号入力"
                      aria-describedby="phone-format-hint"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Smartphone className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <p className="text-gray-500" id="phone-format-hint">※ハイフンなしで入力してください</p>
                    <p className="text-gray-400">{phoneNumber.length > 0 ? formatPhoneNumber(phoneNumber) : ''}</p>
                  </div>
                </div>
                
                {/* reCAPTCHA表示/送信ボタン */}
                {!isRecaptchaVisible ? (
                  <button 
                    onClick={showRecaptcha} 
                    disabled={isLoading || !phoneNumber || !validatePhoneNumber(phoneNumber)}
                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 transition duration-200 flex items-center justify-center"
                    aria-label="認証を開始する"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {isLoading ? '準備中...' : '認証を開始する'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    {/* reCAPTCHA表示用のコンテナ */}
                    <div 
                      id="recaptcha-container" 
                      ref={recaptchaContainerRef}
                      className="flex justify-center my-4 min-h-[80px] items-center"
                      aria-label="reCAPTCHA認証"
                    >
                      {!recaptchaResolved && <div className="text-sm text-gray-500">reCAPTCHAを読み込み中...</div>}
                    </div>
                    
                    <button 
                      onClick={handleSendVerificationCode} 
                      disabled={isLoading || !recaptchaResolved}
                      className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 transition duration-200"
                      aria-label="認証コードを送信"
                    >
                      {isLoading ? '送信中...' : '認証コードを送信'}
                    </button>
                    
                    <button 
                      onClick={() => {
                        setIsRecaptchaVisible(false);
                        setRecaptchaResolved(false);
                      }} 
                      disabled={isLoading}
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded disabled:opacity-50 transition duration-200"
                      aria-label="キャンセル"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
                
                {errorMessage && (
                  <div 
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" 
                    role="alert"
                    aria-live="assertive"
                  >
                    <span className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <strong className="font-bold">エラー:</strong>
                    </span>
                    <span className="block sm:inline ml-6">{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer mt-6">
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                <h6 className="text-sm font-semibold text-blue-800 mb-1">認証のメリット</h6>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li className="flex items-start">
                    <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>マッチング機能・メッセージング機能の利用</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>認証バッジで信頼性アップ</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>20ポイントの認証ボーナス獲得</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
        
      case VerificationStep.VERIFICATION_CODE:
        return (
          <div className="card">
            <div className="card-header mb-6">
              <h5 className="card-title text-lg font-bold flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-500" />
                認証コードの確認
              </h5>
              <p className="card-description text-gray-600 mt-2">
                <span className="font-medium">{formatPhoneNumber(phoneNumber)}</span> に送信された6桁の認証コードを入力してください。
              </p>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="verification-code" className="block text-sm font-medium">認証コード（6桁）</label>
                  <input
                    id="verification-code"
                    className="w-full p-3 text-center text-xl tracking-widest font-medium border rounded focus:ring-2 focus:ring-green-300 focus:border-green-500 focus:outline-none"
                    placeholder="______"
                    value={verificationCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      // 数字のみを許可
                      const input = e.target.value.replace(/[^0-9]/g, '');
                      setVerificationCode(input);
                    }}
                    disabled={isLoading}
                    maxLength={6}
                    type="tel"
                    autoFocus
                    aria-label="認証コード入力"
                  />
                  
                  {/* 制限時間表示を追加 */}
                  <div className="text-center mt-2">
                    {timeRemaining > 0 ? (
                      <div className="flex items-center justify-center text-sm text-blue-600">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>再送信可能まで: {timeRemaining}秒</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
                        aria-label="認証コードを再送信"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        認証コードを再送信
                      </button>
                    )}
                  </div>
                  
                  <div className="text-center mt-1">
                    <p className="text-xs text-gray-500">
                      SMSが届かない場合は、電話番号が正しいことを確認し、少し時間をおいてから再試行してください
                    </p>
                  </div>
                </div>
                
                {errorMessage && (
                  <div 
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" 
                    role="alert"
                    aria-live="assertive"
                  >
                    <span className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <strong className="font-bold">エラー:</strong>
                    </span>
                    <span className="block sm:inline ml-6">{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer mt-6 flex justify-between space-x-3">
              <button 
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded disabled:opacity-50 transition duration-200"
                onClick={() => {
                  setCurrentStep(VerificationStep.INPUT_PHONE);
                  setVerificationCode('');
                  setErrorMessage('');
                  setIsRecaptchaVisible(false);
                  setRecaptchaResolved(false);
                  
                  // タイマーをクリア
                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                  }
                  setTimeRemaining(0);
                }}
                disabled={isLoading}
                aria-label="前の画面に戻る"
              >
                戻る
              </button>
              <button 
                onClick={handleVerifyCode} 
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded disabled:opacity-50 transition duration-200"
                aria-label="認証コードを確認"
              >
                {isLoading ? '確認中...' : '認証する'}
              </button>
            </div>
          </div>
        );
        
      case VerificationStep.COMPLETED:
        return (
          <div className="card">
            <div className="card-header mb-6">
              <h5 className="card-title text-lg font-bold flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-500" />
                認証完了
              </h5>
              <p className="card-description text-gray-600 mt-2">
                電話番号認証が完了しています。マッチング機能やメッセージング機能が利用可能です。
              </p>
            </div>
            <div className="card-content">
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="bg-green-100 rounded-full p-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-green-700">認証済み</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPhoneNumber(verifiedPhone || '電話番号')}が認証されています
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4 w-full mt-4">
                  <div className="flex items-center justify-center text-yellow-700">
                    <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">20ポイント獲得済み</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer mt-4">
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                <h6 className="text-sm font-semibold text-blue-800">これからできること</h6>
                <ul className="text-xs text-blue-700 space-y-1 mt-2">
                  <li className="flex items-start">
                    <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>マッチング機能でお気に入りユーザーを探す</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>メッセージを送受信する</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>動画レビューでさらにポイントを獲得</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto border rounded-lg shadow-sm p-6 bg-white">
      {renderVerificationStep()}
    </div>
  );
};

export default PhoneVerification;