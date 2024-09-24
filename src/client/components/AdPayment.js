// src\client\components\AdPayment.js
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { FaCreditCard, FaPaypal, FaLock } from 'react-icons/fa';
import { getFunctions, httpsCallable } from 'firebase/functions';

const PaymentContainer = styled.div`
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
`;

const PaymentTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 15px;
`;

const PriceDisplay = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
`;

const PaymentMethod = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid ${({ selected, theme }) => selected ? theme.colors.primary : theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  background-color: ${({ selected, theme }) => selected ? theme.colors.backgroundLight : 'white'};
`;

const PaymentIcon = styled.span`
  margin-right: 10px;
`;

const PaymentLabel = styled.label`
  cursor: pointer;
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
  margin-top: 20px;

  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin-top: 10px;
`;

const SuccessMessage = styled.p`
  color: ${({ theme }) => theme.colors.success};
  margin-top: 10px;
`;

const SecurityNote = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.textLight};
  margin-top: ${({ theme }) => theme.spacing.small};
  display: flex;
  align-items: center;
`;

const LockIcon = styled(FaLock)`
  margin-right: ${({ theme }) => theme.spacing.xsmall};
`;

const AdPayment = ({ adId, price, onPaymentComplete }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleMethodChange = useCallback((method) => {
    setSelectedMethod(method);
    setError(null);
  }, []);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const functions = getFunctions();
      const processPayment = httpsCallable(functions, 'processPayment');
      const result = await processPayment({
        adId,
        method: selectedMethod,
        amount: price
      });

      if (result.data.success) {
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
      <PaymentMethod 
        onClick={() => handleMethodChange('credit_card')}
        selected={selectedMethod === 'credit_card'}
      >
        <input
          type="radio"
          id="credit_card"
          name="payment_method"
          value="credit_card"
          checked={selectedMethod === 'credit_card'}
          onChange={() => {}}
        />
        <PaymentIcon><FaCreditCard /></PaymentIcon>
        <PaymentLabel htmlFor="credit_card">クレジットカード</PaymentLabel>
      </PaymentMethod>
      <PaymentMethod 
        onClick={() => handleMethodChange('paypal')}
        selected={selectedMethod === 'paypal'}
      >
        <input
          type="radio"
          id="paypal"
          name="payment_method"
          value="paypal"
          checked={selectedMethod === 'paypal'}
          onChange={() => {}}
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
      <SecurityNote>
        <LockIcon /> すべての支払い情報は暗号化されて安全に処理されます。
      </SecurityNote>
    </PaymentContainer>
  );
};

export default React.memo(AdPayment);

// Note: This component assumes that you have set up a Cloud Function named 'processPayment'
// in your Firebase project. This function should handle the actual payment processing and
// return a result indicating success or failure.

// TODO: Implement actual payment processing logic in the Cloud Function.
// The function should integrate with a payment gateway and handle the following:
// - Validate the payment amount
// - Process the payment using the selected method
// - Update the ad status in Firestore upon successful payment
// - Handle any errors and provide appropriate feedback