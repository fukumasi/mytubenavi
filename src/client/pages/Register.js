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

const Select = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  font-size: 16px;
  background-color: white;

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

const LinkContainer = styled.div`
  margin-top: 16px;
  text-align: center;
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    userType: "general",
  });
  const [message, setMessage] = useState({ text: "", isError: false });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", isError: false });
    setIsLoading(true);

    try {
      const success = await register(formData.username, formData.email, formData.password, formData.userType);
      if (success) {
        setMessage({ text: "登録が完了しました。ログインページに移動します...", isError: false });
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setMessage({ text: "登録に失敗しました。もう一度お試しください。", isError: true });
      }
    } catch (error) {
      setMessage({ text: error.response?.data?.message || "登録中にエラーが発生しました。", isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Title>新規登録</Title>
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
        <Select name="userType" value={formData.userType} onChange={handleChange}>
          <option value="general">一般ユーザー</option>
          <option value="creator">クリエイター</option>
        </Select>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "登録中..." : "登録"}
        </Button>
        {message.text && <Message isError={message.isError}>{message.text}</Message>}
        <LinkContainer>
          すでにアカウントをお持ちの方は <StyledLink to="/login">こちら</StyledLink>
        </LinkContainer>
      </Form>
    </Container>
  );
};

export default Register;
