import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, googleSignIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await signup(email, password);
      navigate('/');
    } catch {
      setError('アカウントの作成に失敗しました');
    }

    setLoading(false);
  }

  async function handleGoogleSignUp() {
    try {
      setError('');
      setLoading(true);
      await googleSignIn();
      navigate('/');
    } catch {
      setError('Googleでの登録に失敗しました');
    }

    setLoading(false);
  }

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
          <Form onSubmit={handleSubmit}>
            <Form.Group id="email">
              <Form.Label>メールアドレス</Form.Label>
              <Form.Control type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Form.Group>
            <Form.Group id="password">
              <Form.Label>パスワード</Form.Label>
              <Form.Control type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Form.Group>
            <Button disabled={loading} className="w-100 mt-3" type="submit">
              登録
            </Button>
          </Form>
          <Button variant="outline-primary" className="w-100 mt-3" onClick={handleGoogleSignUp} disabled={loading}>
            Googleで登録
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;