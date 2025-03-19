// src/components/admin/RefundModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { processRefund } from '../../services/paymentService';

// フォームデータの型定義
interface RefundFormData {
  reason: string;
  amount: number;
  isFullRefund: boolean;
}

// バリデーションスキーマ
const refundSchema = yup.object().shape({
  reason: yup.string().required('返金理由は必須です'),
  amount: yup.number()
    .typeError('有効な金額を入力してください')
    .positive('金額は0より大きい値を入力してください')
    .max(yup.ref('$originalAmount'), '返金額は元の金額を超えることはできません')
    .required('返金金額は必須です'),
  isFullRefund: yup.boolean().required().default(true),
});

// 返金モーダルのプロパティ型定義
interface RefundModalProps {
  show: boolean;
  onHide: () => void;
  paymentId: string;
  paymentType: 'premium' | 'promotion';
  originalAmount: number;
  stripePaymentIntentId?: string;
  onRefundComplete?: () => void;
  customerName?: string;
  paymentDate?: string;
}

const RefundModal: React.FC<RefundModalProps> = ({
  show,
  onHide,
  paymentId,
  paymentType,
  originalAmount,
  stripePaymentIntentId,
  onRefundComplete,
  customerName,
  paymentDate
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isValid } } = useForm<RefundFormData>({
    resolver: yupResolver(refundSchema as any),
    context: { originalAmount },
    defaultValues: {
      reason: '',
      amount: originalAmount,
      isFullRefund: true,
    }
  });

  // isFullRefund の値を監視
  const isFullRefund = watch('isFullRefund');
  const currentAmount = watch('amount');
  const currentReason = watch('reason');

  // 全額返金のチェックが変更されたとき
  useEffect(() => {
    if (isFullRefund) {
      setValue('amount', originalAmount);
    }
  }, [isFullRefund, originalAmount, setValue]);

  // モーダルが閉じられたときにフォームをリセット
  useEffect(() => {
    if (!show) {
      reset({
        reason: '',
        amount: originalAmount,
        isFullRefund: true,
      });
      setError(null);
      setConfirmStep(false);
    }
  }, [show, originalAmount, reset]);

  // 入力確認画面へ進む
  const handleProceedToConfirm = async () => {
    const isFormValid = await handleSubmit(() => {})();
    if (isFormValid) {
      setConfirmStep(true);
    }
  };

  // 返金処理実行
  const onSubmit = async (data: RefundFormData) => {
    if (!stripePaymentIntentId) {
      setError('決済IDが見つかりません。システム管理者に連絡してください。');
      return;
    }
  
    setProcessing(true);
    setError(null);
  
    try {
      // 実際の返金処理を実行
      await processRefund({
        paymentId,
        paymentType,
        stripePaymentIntentId,
        amount: data.amount,
        reason: data.reason,
        isFullRefund: data.isFullRefund
      });
      
      toast.success('返金処理が完了しました', {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      if (onRefundComplete) {
        onRefundComplete();
      }
      
      onHide();
    } catch (err: any) {
      console.error('返金処理エラー:', err);
      setError(
        err?.message || 
        '返金処理中にエラーが発生しました。ネットワーク接続を確認し、もう一度お試しください。問題が解決しない場合はシステム管理者に連絡してください。'
      );
      setConfirmStep(false);
    } finally {
      setProcessing(false);
    }
  };

  // 確認画面から入力画面に戻る
  const handleBackToEdit = () => {
    setConfirmStep(false);
  };

  // 入力フォーム
  const renderInputForm = () => (
    <Form onSubmit={(e) => { e.preventDefault(); handleProceedToConfirm(); }}>
      {customerName && paymentDate && (
        <Alert variant="info" className="mb-3">
          <strong>{customerName}</strong> 様の {paymentDate} の決済に対する返金処理です。
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label>返金タイプ</Form.Label>
        <Form.Check
          type="checkbox"
          id="isFullRefund"
          label="全額返金"
          {...register('isFullRefund')}
          className="user-select-none"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>返金金額</Form.Label>
        <InputGroup>
          <InputGroup.Text>¥</InputGroup.Text>
          <Form.Control
            type="number"
            disabled={isFullRefund}
            {...register('amount')}
            max={originalAmount}
          />
        </InputGroup>
        {errors.amount && (
          <Form.Text className="text-danger">
            {errors.amount.message}
          </Form.Text>
        )}
        <Form.Text className="text-muted">
          元の金額: ¥{originalAmount.toLocaleString()}
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>返金理由 <span className="text-danger">*</span></Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="返金理由を入力してください"
          {...register('reason')}
        />
        {errors.reason && (
          <Form.Text className="text-danger">
            {errors.reason.message}
          </Form.Text>
        )}
        <Form.Text className="text-muted">
          返金理由はシステム内に記録されます
        </Form.Text>
      </Form.Group>

      {error && (
        <Alert variant="danger" className="mt-3">
          <Alert.Heading>エラー</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}
    </Form>
  );

  // 確認画面
  const renderConfirmation = () => (
    <div>
      <Alert variant="warning" className="mb-4">
        <Alert.Heading>返金内容の確認</Alert.Heading>
        <p>以下の内容で返金処理を実行します。内容を確認してください。</p>
        <hr />
        <p className="mb-0">この操作は取り消せません。</p>
      </Alert>

      <div className="mb-3">
        <h6>返金タイプ:</h6>
        <p>{isFullRefund ? '全額返金' : '一部返金'}</p>
      </div>

      <div className="mb-3">
        <h6>返金金額:</h6>
        <p>¥{currentAmount.toLocaleString()} {isFullRefund && '(全額)'}</p>
      </div>

      <div className="mb-3">
        <h6>返金理由:</h6>
        <p style={{ whiteSpace: 'pre-wrap' }}>{currentReason}</p>
      </div>

      {customerName && (
        <div className="mb-3">
          <h6>顧客名:</h6>
          <p>{customerName}</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="mt-3">
          <Alert.Heading>エラー</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}
    </div>
  );

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      backdrop="static"
      size={confirmStep ? 'lg' : 'md'}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {confirmStep ? '返金内容の確認' : '返金処理'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!confirmStep ? renderInputForm() : renderConfirmation()}
      </Modal.Body>
      <Modal.Footer>
        {!confirmStep ? (
          <>
            <Button variant="secondary" onClick={onHide} disabled={processing}>
              キャンセル
            </Button>
            <Button 
              variant="primary" 
              onClick={handleProceedToConfirm}
              disabled={processing}
            >
              次へ
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleBackToEdit} disabled={processing}>
              戻る
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit(onSubmit)}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  処理中...
                </>
              ) : (
                '返金処理を実行'
              )}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default RefundModal;