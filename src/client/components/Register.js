import React, { useState } from 'react';
import axios from 'axios';
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

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    userType: 'general'
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/register', formData);
      setMessage(res.data.message);
    } catch (error) {
      setMessage(error.response.data.message);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>新規登録</h2>
      <Input
        type="text"
        name="username"
        placeholder="ユーザー名"
        value={formData.username}
        onChange={handleChange}
        required
      />
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
      <select name="userType" value={formData.userType} onChange={handleChange}>
        <option value="general">一般ユーザー</option>
        <option value="creator">クリエイター</option>
      </select>
      <Button type="submit">登録</Button>
      {message && <p>{message}</p>}
    </Form>
  );
};

export default Register;