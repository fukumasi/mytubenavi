import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Form = styled.form`
  // ... 既存のスタイル
`;

const Input = styled.input`
  // ... 既存のスタイル
`;

const Button = styled.button`
  // ... 既存のスタイル
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 10px;
`;

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      navigate('/'); // ログイン後はホームページにリダイレクト
    } catch (error) {
      if (error.response) {
        setError(error.response.data.message);
      } else {
        setError('ログインに失敗しました。後でもう一度お試しください。');
      }
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>ログイン</h2>
      <Input
        type="email"
        name="email"
        placeholder="メールアドレス"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <Input
        type="password"
        name="password"
        placeholder="パスワード"
        value={formData.password}
        onChange={handleChange}
        required
      />
      <Button type="submit">ログイン</Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Form>
  );
};

export default Login;