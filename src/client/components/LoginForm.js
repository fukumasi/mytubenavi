// src/client/components/LoginForm.js

import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { handleFirebaseError } from '../../firebase';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, googleLogin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      setSuccess('ログインに成功しました');
      setError('');
      navigate('/dashboard');
    } catch (err) {
      handleFirebaseError(err);
      setError('ログインに失敗しました: ' + err.message);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await googleLogin();
      setSuccess('Googleアカウントでログインに成功しました');
      setError('');
      navigate('/dashboard');
    } catch (err) {
      handleFirebaseError(err);
      setError('Googleログインに失敗しました: ' + err.message);
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleLogin}>
      <Form.Group className="mb-3" controlId="formBasicEmail">
        <Form.Label>Email address</Form.Label>
        <Form.Control
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formBasicPassword">
        <Form.Label>Password</Form.Label>
        <Form.Control
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </Form.Group>

      <Button variant="primary" type="submit" disabled={loading}>
        {loading ? 'ログイン中...' : 'ログイン'}
      </Button>
      <Button variant="secondary" onClick={handleGoogleLogin} disabled={loading}>
        {loading ? 'ログイン中...' : 'Googleでログイン'}
      </Button>

      {error && <div className="text-danger mt-2">{error}</div>}
      {success && <div className="text-success mt-2">{success}</div>}
    </Form>
  );
};

export default LoginForm;