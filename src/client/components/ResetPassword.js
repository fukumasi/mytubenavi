import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  max-width: 300px;
  margin: 0 auto;
`;

const Input = styled.input`
  margin-bottom: 10px;
  padding: 8px;
`;

const Button = styled.button`
  padding: 8px;
  background-color: #0066cc;
  color: white;
  border: none;
  cursor: pointer;
`;

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const { resetToken } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setMessage('パスワードが一致しません');
    }
    try {
      const res = await axios.put(`/api/auth/reset-password/${resetToken}`, { password });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      setMessage(error.response.data.message);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>新しいパスワードを設定</h2>
      <Input
        type="password"
        placeholder="新しいパスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="パスワードの確認"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      <Button type="submit">パスワードをリセット</Button>
      {message && <p>{message}</p>}
    </Form>
  );
};

export default ResetPassword;