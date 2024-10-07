import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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

const BackToProfileLink = styled(Link)`
  display: block;
  margin-top: 20px;
  color: #007bff;
  text-decoration: none;
`;

const EditProfile = () => {
  const { t } = useTranslation();
  const { currentUser, updateUserEmail, updateUserPassword, updateUserProfile } = useAuth();
  const [userData, setUserData] = useState({
    displayName: "",
    email: "",
    bio: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              displayName: data.displayName || "",
              email: currentUser.email || "",
              bio: data.bio || "",
            });
          }
        } catch (error) {
          setError(t("userDataFetchError"));
        }
      }
    };
    fetchUserData();
  }, [currentUser, t]);

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
      if (currentUser) {
        await setDoc(doc(db, "users", currentUser.uid), {
          displayName: userData.displayName,
          bio: userData.bio,
        }, { merge: true });
        await updateUserProfile({
          displayName: userData.displayName,
        });
        setSuccess(t("profileUpdateSuccess"));
      } else {
        throw new Error(t("userNotFound"));
      }
    } catch (error) {
      setError(t("profileUpdateError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!currentPassword) {
      setError(t("currentPasswordRequired"));
      setIsLoading(false);
      return;
    }

    try {
      if (currentUser) {
        const result = await updateUserEmail(userData.email, currentPassword);
        if (result.success) {
          setSuccess(t("emailUpdateAndVerificationSent"));
          setCurrentPassword("");
        }
      } else {
        throw new Error(t("userNotFound"));
      }
    } catch (error) {
      console.error("Email update error:", error);
      if (error.message.includes('Please log out and log in again')) {
        setError(t("recentLoginRequired"));
      } else if (error.message.includes('The provided password is incorrect')) {
        setError(t("wrongPassword"));
      } else if (error.message.includes('Email address change is not allowed')) {
        setError(t("emailUpdateNotAllowed"));
      } else {
        setError(error.message || t("emailUpdateError"));
      }
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
      setError(t("passwordMismatch"));
      setIsLoading(false);
      return;
    }

    if (!currentPassword) {
      setError(t("currentPasswordRequired"));
      setIsLoading(false);
      return;
    }

    try {
      if (currentUser) {
        await updateUserPassword(currentPassword, newPassword);
        setSuccess(t("passwordUpdateSuccess"));
        setNewPassword("");
        setConfirmNewPassword("");
        setCurrentPassword("");
      } else {
        throw new Error(t("userNotFound"));
      }
    } catch (error) {
      console.error("Password update error:", error);
      if (error.code === "auth/wrong-password") {
        setError(t("wrongPassword"));
      } else if (error.code === "auth/requires-recent-login") {
        setError(t("recentLoginRequired"));
      } else {
        setError(t("passwordUpdateError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer>
      <h2>{t("editProfile")}</h2>
      <Form onSubmit={handleUpdateProfile}>
        <Label htmlFor="displayName">{t("displayName")}</Label>
        <Input
          type="text"
          id="displayName"
          name="displayName"
          value={userData.displayName}
          onChange={handleChange}
          autoComplete="name"
        />
        <Label htmlFor="bio">{t("bio")}</Label>
        <TextArea
          id="bio"
          name="bio"
          value={userData.bio}
          onChange={handleChange}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("updating") : t("updateProfile")}
        </Button>
      </Form>

      <Form onSubmit={handleUpdateEmail}>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={userData.email}
          onChange={handleChange}
          autoComplete="email"
        />
        <Label htmlFor="currentPasswordForEmail">{t("currentPassword")}</Label>
        <Input
          type="password"
          id="currentPasswordForEmail"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("updating") : t("updateEmail")}
        </Button>
      </Form>

      <Form onSubmit={handleUpdatePassword}>
        <input type="text" autoComplete="username" style={{ display: 'none' }} aria-hidden="true" />
        <Label htmlFor="currentPasswordForPassword">{t("currentPassword")}</Label>
        <Input
          type="password"
          id="currentPasswordForPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Label htmlFor="confirmNewPassword">{t("confirmNewPassword")}</Label>
        <Input
          type="password"
          id="confirmNewPassword"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("updating") : t("updatePassword")}
        </Button>
      </Form>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <BackToProfileLink to="/profile">{t("backToProfile")}</BackToProfileLink>
    </FormContainer>
  );
};

export default EditProfile;