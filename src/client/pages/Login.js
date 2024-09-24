import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, googleSignIn } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch {
      setError(t('loginError'));
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await googleSignIn();
      navigate('/');
    } catch {
      setError(t('googleLoginError'));
    }

    setLoading(false);
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <h2 className="text-center mb-4">{t('login')}</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group id="email">
              <Form.Label>{t('email')}</Form.Label>
              <Form.Control type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Form.Group>
            <Form.Group id="password">
              <Form.Label>{t('password')}</Form.Label>
              <Form.Control type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Form.Group>
            <Button disabled={loading} className="w-100 mt-3" type="submit">
              {t('login')}
            </Button>
          </Form>
          <Button variant="outline-primary" className="w-100 mt-3" onClick={handleGoogleLogin} disabled={loading}>
            {t('googleLogin')}
          </Button>
          <div className="w-100 text-center mt-3">
            <Link to="/register">{t('noAccount')}</Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;