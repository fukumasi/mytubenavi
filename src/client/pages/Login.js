import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom"; // useLocation を追加
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";

// ... (styled components are unchanged)

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // 追加: 現在のロケーション情報を取得
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        // 変更: リダイレクト先を動的に設定
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
      }
    } catch (error) {
      setError("ログイン中にエラーが発生しました。後でもう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  // ... (return statement is unchanged)
};

export default Login;