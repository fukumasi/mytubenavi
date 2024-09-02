import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import styled from "styled-components";

const Form = styled.form`
  // ... styles ...
`;

const Input = styled.input`
  // ... styles ...
`;

const Button = styled.button`
  // ... styles ...
`;

const ErrorMessage = styled.div`
  color: red;
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  color: green;
  margin-top: 1rem;
`;

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      const response = await login(email, password, twoFactorToken);
      if (response.requireTwoFactor) {
        setShowTwoFactor(true);
        setSuccess("2要素認証コードを入力してください。");
        return;
      }
      setSuccess("ログインに成功しました。リダイレクトします...");
      // リダイレクトロジックをここに追加
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "ログインに失敗しました。入力情報を確認してください。");
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        required
        minLength={12}
      />
      {showTwoFactor && (
        <Input
          type="text"
          value={twoFactorToken}
          onChange={(e) => setTwoFactorToken(e.target.value)}
          placeholder="2要素認証コード"
          required
        />
      )}
      <Button type="submit">ログイン</Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      <div>
        <a href="/forgot-password">パスワードをお忘れですか？</a>
      </div>
      <div>
        <a href="/register">アカウントをお持ちでない方はこちら</a>
      </div>
    </Form>
  );
};

export default LoginForm;