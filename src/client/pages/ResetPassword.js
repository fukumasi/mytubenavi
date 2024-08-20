import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: 8px;
  box-shadow: 0 4px 6px ${({ theme }) => theme.colors.shadow};
`;

const Title = styled.h2`
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const Message = styled.p`
  margin-top: 16px;
  text-align: center;
  color: ${({ isError, theme }) => isError ? theme.colors.error : theme.colors.success};
`;

const PasswordStrengthMeter = styled.div`
  height: 5px;
  margin-bottom: 10px;
  background-color: #ddd;
`;

const PasswordStrengthIndicator = styled.div`
  height: 100%;
  width: ${props => props.strength}%;
  background-color: ${props => {
    if (props.strength < 33) return 'red';
    if (props.strength < 66) return 'orange';
    return 'green';
  }};
  transition: width 0.3s ease-in-out, background-color 0.3s ease-in-out;
`;

const PasswordStrengthText = styled.p`
  margin-top: 5px;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
`;

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { resetToken } = useParams();
  const { confirmResetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]+/)) strength += 25;
    if (password.match(/[A-Z]+/)) strength += 25;
    if (password.match(/[0-9]+/)) strength += 25;
    if (password.match(/[$@#&!]+/)) strength += 25;
    return Math.min(100, strength);
  };

  const getPasswordStrengthText = (strength) => {
    if (strength < 33) return "弱い";
    if (strength < 66) return "普通";
    return "強い";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", isError: false });

    if (password !== confirmPassword) {
      setMessage({ text: "パスワードが一致しません", isError: true });
      return;
    }

    if (password.length < 8 || passwordStrength < 66) {
      setMessage({ text: "パスワードは8文字以上で、大文字、小文字、数字、特殊文字を含める必要があります", isError: true });
      return;
    }

    setIsLoading(true);

    try {
      await confirmResetPassword(resetToken, password);
      setMessage({ text: "パスワードが正常にリセットされました。ログインページに移動します...", isError: false });
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      setMessage({ text: error.response?.data?.message || "パスワードのリセットに失敗しました。", isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Title>新しいパスワードを設定</Title>
        <Input
          type="password"
          placeholder="新しいパスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength="8"
          aria-label="新しいパスワード"
          autoComplete="new-password"
        />
        <PasswordStrengthMeter>
          <PasswordStrengthIndicator strength={passwordStrength} />
        </PasswordStrengthMeter>
        <PasswordStrengthText>
          パスワード強度: {getPasswordStrengthText(passwordStrength)}
        </PasswordStrengthText>
        <Input
          type="password"
          placeholder="パスワードの確認"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength="8"
          aria-label="パスワードの確認"
          autoComplete="new-password"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "処理中..." : "パスワードをリセット"}
        </Button>
        {message.text && <Message isError={message.isError} role={message.isError ? "alert" : "status"} aria-live="polite">{message.text}</Message>}
      </Form>
    </Container>
  );
};

export default ResetPassword;