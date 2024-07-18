import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const Form = styled.form`
  // ... styles ...
`;

const Input = styled.input`
  // ... styles ...
`;

const Button = styled.button`
  // ... styles ...
`;

const ErrorMessage = styled.div`
  color: red;
  margin-top: 1rem;
`;

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        required
      />
      <Button type="submit">ログイン</Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Form>
  );
};

export default LoginForm;