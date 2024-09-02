import React, { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FaCreditCard, FaPaypal } from 'react-icons/fa';

const PaymentContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spacing.medium};
  margin-top: ${({ theme }) => theme.spacing.large};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PaymentTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.medium};
  margin-bottom: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.text};
`;

const PaymentMethod = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.small};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.small};
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ selected, theme }) => selected ? theme.colors.primaryLight : 'transparent'};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryLight};
  }
`;

const PaymentIcon = styled.span`
  margin-right: ${({ theme }) => theme.spacing.small};
  color: ${({ theme }) => theme.colors.primary};
`;

const PaymentLabel = styled.span`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  font-weight: 500;
  margin-top: ${({ theme }) => theme.spacing.medium};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin-top: ${({ theme }) => theme.spacing.small};
`;

const SuccessMessage = styled.p`
  color: ${({ theme }) => theme.colors.success};
  margin-top: ${({ theme }) => theme.spacing.small};
`;

const PriceDisplay = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: bold;
  margin: ${({ theme }) => theme.spacing.medium} 0;
  color: ${({ theme }) => theme.colors.primary};
`;

const AdPayment = ({ adId, price, onPaymentComplete }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // ここで実際の支払い処理を行います。
      // 本番環境では、セキュアな支払いゲートウェイを使用する必要があります。
      const response = await axios.post(`/api/ad-videos/${adId}/pay`, {
        method: selectedMethod,
        amount: price
      });

      if (response.data.success) {
        setSuccess(true);
        onPaymentComplete();
      } else {
        setError('支払い処理に失敗しました。もう一度お試しください。');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(`支払い処理中にエラーが発生しました: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PaymentContainer>
      <PaymentTitle>広告料金の支払い</PaymentTitle>
      <PriceDisplay>¥{price.toLocaleString()}</PriceDisplay>
      <PaymentMethod>
        <input
          type="radio"
          id="credit_card"
          name="payment_method"
          value="credit_card"
          checked={selectedMethod === 'credit_card'}
          onChange={() => setSelectedMethod('credit_card')}
        />
        <PaymentIcon><FaCreditCard /></PaymentIcon>
        <PaymentLabel htmlFor="credit_card">クレジットカード</PaymentLabel>
      </PaymentMethod>
      <PaymentMethod>
        <input
          type="radio"
          id="paypal"
          name="payment_method"
          value="paypal"
          checked={selectedMethod === 'paypal'}
          onChange={() => setSelectedMethod('paypal')}
        />
        <PaymentIcon><FaPaypal /></PaymentIcon>
        <PaymentLabel htmlFor="paypal">PayPal</PaymentLabel>
      </PaymentMethod>
      <Button
        onClick={handlePayment}
        disabled={!selectedMethod || isProcessing || success}
      >
        {isProcessing ? '処理中...' : `¥${price.toLocaleString()}を支払う`}
      </Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>支払いが完了しました。ありがとうございます！</SuccessMessage>}
    </PaymentContainer>
  );
};

export default AdPayment;

// TODO: 複数の支払い方法の実装（銀行振込、暗号通貨など）
// TODO: 支払い履歴の表示機能
// TODO: 定期支払いオプションの追加
// TODO: 支払い確認メールの送信機能
// TODO: 請求書生成機能の実装
// TODO: 支払い方法ごとの手数料表示
// TODO: 多言語対応（国際化）
// TODO: ダークモードのサポート
// TODO: アクセシビリティの改善（ARIA属性の追加）
// TODO: 支払いのキャンセル機能
// TODO: 支払い情報の保存機能（次回の支払いを簡素化）
// TODO: セキュリティ強化（PCI DSS準拠）
// TODO: 支払い処理のログ機能
// TODO: A/Bテスト機能（異なる支払いUIの効果を測定）
// TODO: 動的な価格設定（需要に基づいて価格を調整）