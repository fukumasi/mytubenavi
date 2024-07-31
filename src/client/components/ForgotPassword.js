import React, { useState } from 'react';
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

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (error) {
      setMessage(error.response.data.message);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>パスワードをお忘れの方</h2>
      <Input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit">リセットリンクを送信</Button>
      {message && <p>{message}</p>}
    </Form>
  );
};

export default ForgotPassword;