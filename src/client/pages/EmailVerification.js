import React, { useState } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

const EmailVerification = () => {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser, sendVerificationEmail, isEmailVerified } = useAuth();

  async function handleResendVerification() {
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await sendVerificationEmail();
      setMessage('確認メールを再送信しました。メールをご確認ください。');
    } catch {
      setError('確認メールの送信に失敗しました。しばらくしてからもう一度お試しください。');
    }
    setLoading(false);
  }

  if (isEmailVerified()) {
    return (
      <Container className="mt-5">
        <Helmet>
          <title>メール確認完了 - MyTubeNavi</title>
        </Helmet>
        <Row className="justify-content-md-center">
          <Col md={6}>
            <Alert variant="success">
              メールアドレスは既に確認済みです。全ての機能をご利用いただけます。
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Helmet>
        <title>メールアドレス確認 - MyTubeNavi</title>
        <meta name="description" content="MyTubeNaviのメールアドレス確認ページです。アカウントを有効化するために、メールアドレスの確認を行ってください。" />
      </Helmet>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <h2 className="text-center mb-4">メールアドレス確認</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}
          <p>
            {currentUser.email} 宛に確認メールを送信しました。メールに記載されているリンクをクリックして、アカウントを有効化してください。
          </p>
          <p>
            確認メールが届いていない場合は、以下のボタンをクリックして再送信できます。
          </p>
          <Button
            disabled={loading}
            className="w-100 mt-3"
            onClick={handleResendVerification}
          >
            確認メールを再送信
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default EmailVerification;