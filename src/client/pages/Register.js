import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

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

const InputGroup = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
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
  color: ${({ isError, theme }) => (isError ? theme.colors.error : theme.colors.success)};
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

const PasswordToggle = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
`;

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "general",
  });
  const [message, setMessage] = useState({ text: "", isError: false });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth() || {}; // useAuthがundefinedの場合でもエラーを防ぐ

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: "パスワードが一致しません", isError: true });
      return false;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setMessage({ text: "パスワードは8文字以上で、大文字、小文字、数字、特殊文字を含む必要があります", isError: true });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", isError: false });

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await register(formData.username, formData.email, formData.password, formData.userType);
      if (result?.success) {
        setMessage({ text: "登録が完了しました。確認メールを送信しました。ログインページに移動します...", isError: false });
        setTimeout(() => navigate("/login"), 5000);
      } else {
        setMessage({ text: result?.message || "登録に失敗しました。もう一度お試しください。", isError: true });
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
        <InputGroup>
          <Input
            type="text"
            name="username"
            placeholder="ユーザー名"
            value={formData.username}
            onChange={handleChange}
            required
            aria-label="ユーザー名"
          />
        </InputGroup>
        <InputGroup>
          <Input
            type="email"
            name="email"
            placeholder="メールアドレス"
            value={formData.email}
            onChange={handleChange}
            required
            aria-label="メールアドレス"
          />
        </InputGroup>
        <InputGroup>
          <Input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="パスワード"
            value={formData.password}
            onChange={handleChange}
            required
            aria-label="パスワード"
          />
          <PasswordToggle
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </PasswordToggle>
        </InputGroup>
        <InputGroup>
          <Input
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="パスワード（確認）"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            aria-label="パスワード（確認）"
          />
        </InputGroup>
        <Select name="userType" value={formData.userType} onChange={handleChange} aria-label="ユーザータイプ">
          <option value="general">一般ユーザー</option>
          <option value="creator">クリエイター</option>
        </Select>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "登録中..." : "登録"}
        </Button>
        {message.text && <Message isError={message.isError} role={message.isError ? "alert" : "status"}>{message.text}</Message>}
        <LinkContainer>
          すでにアカウントをお持ちの方は <StyledLink to="/login">こちら</StyledLink>
        </LinkContainer>
      </Form>
    </Container>
  );
};

export default Register;
