import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { updateUser, changeEmail, changePassword } from '../api/userApi';

// スタイルドコンポーネントの定義
const FormContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-top: 10px;
  margin-bottom: 5px;
`;

const Input = styled.input`
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  min-height: 100px;
`;

const Button = styled.button`
  padding: 10px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;

  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin-top: 10px;
`;

const SuccessMessage = styled.p`
  color: ${({ theme }) => theme.colors.success};
  margin-top: 10px;
`;

const EditProfile = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setEmail(currentUser.email || '');
      setBio(currentUser.bio || '');
    }
  }, [currentUser]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const updatedUser = await updateUser({
        username,
        email,
        bio,
      });
      setCurrentUser(updatedUser);
      setSuccess('プロフィールが更新されました');
    } catch (error) {
      setError('プロフィールの更新に失敗しました: ' + error.message);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await changeEmail(email);
      setSuccess('メールアドレスが更新されました');
    } catch (error) {
      setError('メールアドレスの更新に失敗しました: ' + error.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setSuccess('パスワードが変更されました');
    } catch (error) {
      setError('パスワードの変更に失敗しました: ' + error.message);
    }
  };

  if (!currentUser) {
    return <div>読み込み中...</div>;
  }

  return (
    <FormContainer>
      <h2>プロフィールを編集</h2>
      <Form onSubmit={handleUpdateProfile}>
        <Label htmlFor="username">ユーザー名</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Label htmlFor="bio">自己紹介</Label>
        <TextArea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <Button type="submit">更新</Button>
      </Form>

      <Form onSubmit={handleChangeEmail}>
        <Label htmlFor="email">新しいメールアドレス</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit">メールアドレスを更新</Button>
      </Form>

      <Form onSubmit={handleChangePassword}>
        <Label htmlFor="currentPassword">現在のパスワード（変更する場合）</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <Label htmlFor="newPassword">新しいパスワード（オプション）</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit">パスワードを変更</Button>
      </Form>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
    </FormContainer>
  );
};

export default React.memo(EditProfile);