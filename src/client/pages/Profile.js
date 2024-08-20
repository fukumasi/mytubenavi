import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { FaUser, FaTwitter, FaInstagram, FaYoutube } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ImageUploader from "../components/ImageUploader";
import axios from "axios";

// Styled components (既存のものをそのまま使用)
const Container = styled.div`
  // ...
`;

const Title = styled.h1`
  // ...
`;

const Form = styled.form`
  // ...
`;

const FormSection = styled.div`
  // ...
`;

const SectionTitle = styled.h2`
  // ...
`;

const Input = styled.input`
  // ...
`;

const Textarea = styled.textarea`
  // ...
`;

const Select = styled.select`
  // ...
`;

const CheckboxLabel = styled.label`
  // ...
`;

const Checkbox = styled.input`
  // ...
`;

const Button = styled.button`
  // ...
`;

const ErrorMessage = styled.p`
  // ...
`;

const SuccessMessage = styled.p`
  // ...
`;

const InputWithIcon = styled.div`
  // ...
`;

const AvatarPreview = styled.img`
  // ...
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin-top: 10px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #4caf50;
  border-radius: 5px;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const schema = yup.object().shape({
  firstName: yup.string().required("名前は必須です"),
  lastName: yup.string().required("姓は必須です"),
  bio: yup.string().max(500, "自己紹介は500文字以内で入力してください"),
  preferences: yup.object().shape({
    theme: yup.string().oneOf(["light", "dark"]),
    language: yup.string().oneOf(["en", "ja"]),
    notifications: yup.boolean(),
  }),
  socialLinks: yup.object().shape({
    twitter: yup.string().url("有効なTwitter URLを入力してください"),
    instagram: yup.string().url("有効なInstagram URLを入力してください"),
    youtube: yup.string().url("有効なYouTube URLを入力してください"),
  }),
});

const Profile = React.memo(({ showToast }) => {
  const { user, updateProfile } = useAuth();
  const { theme, language, updateTheme, updateLanguage } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: useMemo(() => ({
      firstName: "",
      lastName: "",
      bio: "",
      preferences: { theme: "light", language: "en", notifications: true },
      socialLinks: { twitter: "", instagram: "", youtube: "" },
    }), []),
  });

  useEffect(() => {
    if (user) {
      Object.entries(user).forEach(([key, value]) => {
        setValue(key, value);
      });
      setValue("preferences.theme", theme);
      setValue("preferences.language", language);
      setAvatarPreview(user.avatar);
    }
  }, [user, theme, language, setValue]);

  const onSubmit = useCallback(async (data) => {
    setIsLoading(true);
    try {
      await updateProfile(data);
      showToast("プロフィールが正常に更新されました", "success");
    } catch (error) {
      showToast("プロフィールの更新中にエラーが発生しました", "error");
      console.error("プロフィールの更新中にエラーが発生しました", error);
    } finally {
      setIsLoading(false);
    }
  }, [updateProfile, showToast]);

  const handlePreferenceChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setValue(`preferences.${name}`, newValue);

    if (name === "theme") {
      updateTheme(value);
    } else if (name === "language") {
      updateLanguage(value);
    }
  }, [setValue, updateTheme, updateLanguage]);

  const handleImageUpload = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setIsLoading(true);
      setUploadProgress(0);
      const response = await axios.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      setAvatarPreview(response.data.avatar);
      await updateProfile({ avatar: response.data.avatar });
      showToast("プロフィール画像が正常に更新されました", "success");
    } catch (error) {
      showToast("プロフィール画像のアップロード中にエラーが発生しました", "error");
      console.error('アバターのアップロード中にエラーが発生しました', error);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [updateProfile, showToast]);

  const memoizedImageUploader = useMemo(() => (
    <ImageUploader onImageUpload={handleImageUpload} />
  ), [handleImageUpload]);

  return (
    <Container>
      <Title>ユーザープロフィール</Title>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSection>
          <SectionTitle>基本情報</SectionTitle>
          {memoizedImageUploader}
          {avatarPreview && (
            <AvatarPreview
              src={`/avatars/${avatarPreview}`}
              alt="ユーザーアバター"
            />
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <ProgressBar>
              <ProgressFill progress={uploadProgress} />
            </ProgressBar>
          )}
          <Input
            {...register("firstName")}
            placeholder="名"
            aria-label="名"
            aria-invalid={errors.firstName ? "true" : "false"}
          />
          {errors.firstName && <ErrorMessage role="alert">{errors.firstName.message}</ErrorMessage>}
          <Input
            {...register("lastName")}
            placeholder="姓"
            aria-label="姓"
            aria-invalid={errors.lastName ? "true" : "false"}
          />
          {errors.lastName && <ErrorMessage role="alert">{errors.lastName.message}</ErrorMessage>}
          <Textarea
            {...register("bio")}
            placeholder="自己紹介（500文字以内）"
            aria-label="自己紹介"
            aria-invalid={errors.bio ? "true" : "false"}
          />
          {errors.bio && <ErrorMessage role="alert">{errors.bio.message}</ErrorMessage>}
        </FormSection>

        <FormSection>
          <SectionTitle>設定</SectionTitle>
          <Select
            {...register("preferences.theme")}
            onChange={handlePreferenceChange}
            aria-label="テーマ"
          >
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </Select>
          <Select
            {...register("preferences.language")}
            onChange={handlePreferenceChange}
            aria-label="言語"
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </Select>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              {...register("preferences.notifications")}
              onChange={handlePreferenceChange}
              aria-label="通知設定"
            />
            通知を受け取る
          </CheckboxLabel>
        </FormSection>

        <FormSection>
          <SectionTitle>ソーシャルリンク</SectionTitle>
          <InputWithIcon>
            <FaTwitter aria-hidden="true" />
            <Input
              {...register("socialLinks.twitter")}
              placeholder="Twitter"
              aria-label="Twitter URL"
              aria-invalid={errors.socialLinks?.twitter ? "true" : "false"}
            />
          </InputWithIcon>
          {errors.socialLinks?.twitter && <ErrorMessage role="alert">{errors.socialLinks.twitter.message}</ErrorMessage>}
          <InputWithIcon>
            <FaInstagram aria-hidden="true" />
            <Input
              {...register("socialLinks.instagram")}
              placeholder="Instagram"
              aria-label="Instagram URL"
              aria-invalid={errors.socialLinks?.instagram ? "true" : "false"}
            />
          </InputWithIcon>
          {errors.socialLinks?.instagram && <ErrorMessage role="alert">{errors.socialLinks.instagram.message}</ErrorMessage>}
          <InputWithIcon>
            <FaYoutube aria-hidden="true" />
            <Input
              {...register("socialLinks.youtube")}
              placeholder="YouTube"
              aria-label="YouTube URL"
              aria-invalid={errors.socialLinks?.youtube ? "true" : "false"}
            />
          </InputWithIcon>
          {errors.socialLinks?.youtube && <ErrorMessage role="alert">{errors.socialLinks.youtube.message}</ErrorMessage>}
        </FormSection>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "更新中..." : "プロフィールを更新"}
        </Button>
      </Form>
    </Container>
  );
});

export default Profile;