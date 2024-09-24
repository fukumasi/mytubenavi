import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import styled from "styled-components";

const FormContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

const Label = styled.label`
  margin-bottom: 5px;
`;

const Input = styled.input`
  margin-bottom: 15px;
  padding: 10px;
`;

const TextArea = styled.textarea`
  margin-bottom: 15px;
  padding: 10px;
`;

const Button = styled.button`
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
`;

const SuccessMessage = styled.p`
  color: green;
`;

const EditProfile = () => {
  const { user, updateUserEmail, updateUserPassword } = useAuth();
  const [userData, setUserData] = useState({
    displayName: "",
    email: "",
    bio: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              displayName: data.displayName || "",
              email: user.email || "",
              bio: data.bio || "",
            });
          }
        } catch (error) {
          setError("ユーザーデータの取得に失敗しました。");
        }
      }
    };
    fetchUserData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: userData.displayName,
        bio: userData.bio,
      });
      setSuccess("プロフィールが更新されました。");
    } catch (error) {
      setError("プロフィールの更新に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await updateUserEmail(userData.email);
      await updateDoc(doc(db, "users", user.uid), {
        email: userData.email,
      });
      setSuccess("メールアドレスが更新されました。");
    } catch (error) {
      setError("メールアドレスの更新に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      setError("新しいパスワードが一致しません。");
      setIsLoading(false);
      return;
    }

    try {
      await updateUserPassword(newPassword);
      setSuccess("パスワードが更新されました。");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setError("パスワードの更新に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer>
      <h2>プロフィール編集</h2>
      <Form onSubmit={handleUpdateProfile}>
        <Label htmlFor="displayName">表示名</Label>
        <Input
          type="text"
          id="displayName"
          name="displayName"
          value={userData.displayName}
          onChange={handleChange}
        />
        <Label htmlFor="bio">自己紹介</Label>
        <TextArea
          id="bio"
          name="bio"
          value={userData.bio}
          onChange={handleChange}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "プロフィールを更新"}
        </Button>
      </Form>

      <Form onSubmit={handleUpdateEmail}>
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={userData.email}
          onChange={handleChange}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "メールアドレスを更新"}
        </Button>
      </Form>

      <Form onSubmit={handleUpdatePassword}>
        <Label htmlFor="newPassword">新しいパスワード</Label>
        <Input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Label htmlFor="confirmNewPassword">新しいパスワード（確認）</Label>
        <Input
          type="password"
          id="confirmNewPassword"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "パスワードを更新"}
        </Button>
      </Form>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
    </FormContainer>
  );
};

export default EditProfile;