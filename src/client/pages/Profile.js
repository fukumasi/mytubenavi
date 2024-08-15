import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { FaUser, FaTwitter, FaInstagram, FaYoutube } from "react-icons/fa";

// ... (すべてのstyled-componentsは変更なし)

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { theme, language, updateTheme, updateLanguage } = useSettings();
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    avatar: "",
    preferences: { theme: "light", language: "en", notifications: true },
    socialLinks: { twitter: "", instagram: "", youtube: "" },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setProfile({
        ...user,
        preferences: {
          ...user.preferences,
          theme,
          language,
        },
      });
    }
  }, [user, theme, language]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    }));
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setProfile((prevProfile) => ({
      ...prevProfile,
      preferences: {
        ...prevProfile.preferences,
        [name]: newValue,
      },
    }));

    if (name === "theme") {
      updateTheme(value);
    } else if (name === "language") {
      updateLanguage(value);
    }
  };

  const handleSocialLinkChange = (e) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      socialLinks: {
        ...prevProfile.socialLinks,
        [name]: value,
      },
    }));
  };

  const validateForm = () => {
    if (!profile.firstName || !profile.lastName) {
      setError("名前と姓を入力してください");
      return false;
    }
    if (profile.bio && profile.bio.length > 500) {
      setError("自己紹介は500文字以内で入力してください");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await updateProfile(profile);
      setSuccess("プロフィールが正常に更新されました");
    } catch (error) {
      setError("プロフィールの更新中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>ユーザープロフィール</Title>
      <Form onSubmit={handleSubmit}>
        <FormSection>
          <SectionTitle>基本情報</SectionTitle>
          <AvatarPreview src={profile.avatar || "https://via.placeholder.com/100"} />
          <Input
            type="text"
            name="firstName"
            placeholder="名"
            value={profile.firstName}
            onChange={handleChange}
            required
          />
          <Input
            type="text"
            name="lastName"
            placeholder="姓"
            value={profile.lastName}
            onChange={handleChange}
            required
          />
          <Textarea
            name="bio"
            placeholder="自己紹介（500文字以内）"
            value={profile.bio}
            onChange={handleChange}
            maxLength={500}
          />
          <Input
            type="text"
            name="avatar"
            placeholder="アバターURL"
            value={profile.avatar}
            onChange={handleChange}
          />
        </FormSection>

        <FormSection>
          <SectionTitle>設定</SectionTitle>
          <Select
            name="theme"
            value={profile.preferences.theme}
            onChange={handlePreferenceChange}
          >
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </Select>
          <Select
            name="language"
            value={profile.preferences.language}
            onChange={handlePreferenceChange}
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </Select>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              name="notifications"
              checked={profile.preferences.notifications}
              onChange={handlePreferenceChange}
            />
            通知を受け取る
          </CheckboxLabel>
        </FormSection>

        <FormSection>
          <SectionTitle>ソーシャルリンク</SectionTitle>
          <InputWithIcon>
            <FaTwitter />
            <Input
              type="text"
              name="twitter"
              placeholder="Twitter"
              value={profile.socialLinks.twitter}
              onChange={handleSocialLinkChange}
            />
          </InputWithIcon>
          <InputWithIcon>
            <FaInstagram />
            <Input
              type="text"
              name="instagram"
              placeholder="Instagram"
              value={profile.socialLinks.instagram}
              onChange={handleSocialLinkChange}
            />
          </InputWithIcon>
          <InputWithIcon>
            <FaYoutube />
            <Input
              type="text"
              name="youtube"
              placeholder="YouTube"
              value={profile.socialLinks.youtube}
              onChange={handleSocialLinkChange}
            />
          </InputWithIcon>
        </FormSection>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "プロフィールを更新"}
        </Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
      </Form>
    </Container>
  );
};

export default Profile;