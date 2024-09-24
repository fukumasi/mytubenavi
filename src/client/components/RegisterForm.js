import React, { useState } from 'react';
import { Form, Input, Button, GoogleButton, ErrorMessage, SuccessMessage } from './FormElements';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';  // この行を変更
import { handleFirebaseError } from '../../firebase';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState('general');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(email, password, username, userType);
      setSuccess('登録に成功しました');
      setError('');
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err) {
      handleFirebaseError(err);
      setError(err.message);
      setSuccess('');
    }
  };

  const handleGoogleRegister = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setSuccess('Googleアカウントでの登録に成功しました');
      setError('');
    } catch (err) {
      handleFirebaseError(err);
      setError(err.message);
      setSuccess('');
    }
  };

  return (
    <Form onSubmit={handleRegister}>
      <Input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <select
        value={userType}
        onChange={(e) => setUserType(e.target.value)}
        required
      >
        <option value="general">一般ユーザー</option>
        <option value="creator">クリエイター</option>
      </select>
      <Button type="submit">登録</Button>
      <GoogleButton onClick={handleGoogleRegister} type="button">Googleで登録</GoogleButton>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
    </Form>
  );
};

export default RegisterForm;