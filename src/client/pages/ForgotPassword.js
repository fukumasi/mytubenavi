import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const BackToLogin = styled(Link)`
  margin-top: 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth() || {}; // useAuthがundefinedの場合でもエラーを防ぐ
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", isError: false });

    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      setMessage({ text: "有効なメールアドレスを入力してください。", isError: true });
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(trimmedEmail);
      setMessage({ text: "パスワードリセットリンクをメールで送信しました。", isError: false });
      setTimeout(() => navigate("/login"), 5000);
    } catch (error) {
      setMessage({ text: error.response?.data?.message || "パスワードリセットリンクの送信に失敗しました。", isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Title>パスワードをお忘れの方</Title>
        <Input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="メールアドレス"
          aria-describedby="email-error"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "送信中..." : "リセットリンクを送信"}
        </Button>
        {message.text && (
          <Message 
            isError={message.isError} 
            role={message.isError ? "alert" : "status"}
            aria-live="polite"
          >
            {message.text}
          </Message>
        )}
        <BackToLogin to="/login">ログインページに戻る</BackToLogin>
      </Form>
    </Container>
  );
};

export default ForgotPassword;
