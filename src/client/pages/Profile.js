import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { FaTwitter, FaInstagram, FaYoutube } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ImageUploader from "../components/ImageUploader";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

// Styled components (既存のものをそのまま使用)
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const FormSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 10px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  min-height: 100px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const Button = styled.button`
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  &:disabled {
    background-color: #cccccc;
  }
`;

const ErrorMessage = styled.span`
  color: red;
  font-size: 14px;
  margin-bottom: 10px;
`;

const SuccessMessage = styled.span`
  color: green;
  font-size: 14px;
  margin-bottom: 10px;
`;

const InputWithIcon = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;

  svg {
    margin-right: 10px;
  }
`;

const AvatarPreview = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin-bottom: 10px;
`;

const ProgressFill = styled.div`
  width: ${props => props.progress}%;
  height: 100%;
  background-color: #007bff;
  border-radius: 5px;
  transition: width 0.3s ease-in-out;
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

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const settings = useSettings();
  const theme = settings?.theme ?? "light";
  const language = settings?.language ?? "en";
  const updateTheme = settings?.updateTheme ?? (() => {});
  const updateLanguage = settings?.updateLanguage ?? (() => {});

  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
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
    const fetchUserData = async () => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          Object.entries(userData).forEach(([key, value]) => {
            setValue(key, value);
          });
        }
        setValue("preferences.theme", theme);
        setValue("preferences.language", language);
        setAvatarPreview(user.photoURL);
      }
    };
    fetchUserData();
  }, [user, theme, language, setValue]);

  const onSubmit = useCallback(async (data) => {
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      await updateUserProfile(data);
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
        preferences: data.preferences,
        socialLinks: data.socialLinks,
      });
      setSuccessMessage("プロフィールが正常に更新されました");
    } catch (error) {
      setErrorMessage("プロフィールの更新中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [updateUserProfile, user?.uid]);

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
    const storage = getStorage();
    const storageRef = ref(storage, `avatars/${user.uid}`);

    try {
      setIsLoading(true);
      setUploadProgress(0);
      setSuccessMessage("");
      setErrorMessage("");
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          throw error;
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setAvatarPreview(downloadURL);
          await updateUserProfile({ photoURL: downloadURL });

          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { avatar: downloadURL });

          setSuccessMessage("プロフィール画像が正常に更新されました");
          setIsLoading(false);
          setUploadProgress(0);
        }
      );
    } catch (error) {
      setErrorMessage("プロフィール画像のアップロード中にエラーが発生しました");
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [updateUserProfile, user?.uid]);

  const memoizedImageUploader = useMemo(() => (
    <ImageUploader onImageUpload={handleImageUpload} />
  ), [handleImageUpload]);

  return (
    <Container>
      <Title>ユーザープロフィール</Title>
      {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}
      {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSection>
          <SectionTitle>基本情報</SectionTitle>
          {memoizedImageUploader}
          {avatarPreview && (
            <AvatarPreview
              src={avatarPreview}
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
};

export default Profile;