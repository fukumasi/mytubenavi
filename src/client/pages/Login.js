import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const Container = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const InputGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const PasswordInputContainer = styled.div`
  position: relative;
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

const Button = styled.button`
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  margin-bottom: 10px;
`;

const SuccessMessage = styled.p`
  color: green;
  margin-bottom: 10px;
`;

const Links = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
`;

const RememberMeContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;

  input {
    margin-right: 5px;
  }
`;

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.email) {
      setError("メールアドレスは必須です");
      return false;
    }
    if (!formData.password) {
      setError("パスワードは必須です");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("有効なメールアドレスを入力してください。");
      return false;
    }
    if (requiresTwoFactor && !formData.twoFactorCode) {
      setError("2要素認証コードは必須です");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password, rememberMe, formData.twoFactorCode);
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setError("2要素認証コードを入力してください。");
      } else if (result.success) {
        setSuccess("ログインに成功しました");
        const from = location.state?.from?.pathname || "/";
        setTimeout(() => navigate(from, { replace: true }), 1500);
      } else {
        setError(result.message || "ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      }
    } catch (error) {
      setError(error.message || "ログイン中にエラーが発生しました。後でもう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>ログイン</Title>
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            aria-label="メールアドレス"
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="password">パスワード</Label>
          <PasswordInputContainer>
            <Input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
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
          </PasswordInputContainer>
        </InputGroup>
        {requiresTwoFactor && (
          <InputGroup>
            <Label htmlFor="twoFactorCode">2要素認証コード</Label>
            <Input
              type="text"
              id="twoFactorCode"
              name="twoFactorCode"
              value={formData.twoFactorCode}
              onChange={handleChange}
              required
              aria-label="2要素認証コード"
            />
          </InputGroup>
        )}
        <RememberMeContainer>
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            aria-label="ログイン情報を保存"
          />
          <label htmlFor="rememberMe">ログイン情報を保存する</label>
        </RememberMeContainer>
        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        {success && <SuccessMessage role="status">{success}</SuccessMessage>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "ログイン中..." : "ログイン"}
        </Button>
      </Form>
      <Links>
        <Link to="/forgot-password">パスワードをお忘れですか？</Link>
        <Link to="/register">アカウントをお持ちでない方はこちら</Link>
      </Links>
    </Container>
  );
};

export default Login;