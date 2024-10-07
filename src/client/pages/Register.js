import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';
import { validatePassword } from '../utils/passwordValidation';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // パスワードの一致確認
    if (password !== confirmPassword) {
      return setError('パスワードが一致しません。');
    }

    // パスワード強度の確認
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setError('');
      setPasswordErrors([]);
      setLoading(true);
      await signup(email, password);
      navigate('/');
    } catch {
      setError('アカウントの作成に失敗しました。');
    }

    setLoading(false);
  };

  return (
    <Container className="mt-5">
      <Helmet>
        <title>新規登録 - MyTubeNavi</title>
        <meta name="description" content="MyTubeNaviの新規登録ページです。アカウントを作成して、より多くの機能をお楽しみください。" />
      </Helmet>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <h2 className="text-center mb-4">新規登録</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          {passwordErrors.length > 0 && (
            <Alert variant="danger">
              <ul>
                {passwordErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </Alert>
          )}
          <Form onSubmit={handleSubmit}>
            <Form.Group id="email">
              <Form.Label>メールアドレス</Form.Label>
              <Form.Control
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>
            <Form.Group id="password">
              <Form.Label>パスワード</Form.Label>
              <Form.Control
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group id="password-confirm">
              <Form.Label>パスワード（確認）</Form.Label>
              <Form.Control
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Form.Group>
            <Button disabled={loading} className="w-100 mt-3" type="submit">
              登録
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;