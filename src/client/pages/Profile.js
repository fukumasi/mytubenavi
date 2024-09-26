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
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useTranslation } from "react-i18next";

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

const Profile = () => {
  const { t } = useTranslation();
  const { currentUser, updateUserProfile } = useAuth();
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

  const schema = yup.object().shape({
    firstName: yup.string().required(t("firstNameRequired")),
    lastName: yup.string().required(t("lastNameRequired")),
    bio: yup.string().max(500, t("bioMaxLength")),
    preferences: yup.object().shape({
      theme: yup.string().oneOf(["light", "dark"]),
      language: yup.string().oneOf(["en", "ja"]),
      notifications: yup.boolean(),
    }),
    socialLinks: yup.object().shape({
      twitter: yup.string().url(t("invalidTwitterUrl")),
      instagram: yup.string().url(t("invalidInstagramUrl")),
      youtube: yup.string().url(t("invalidYoutubeUrl")),
    }),
  });

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
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          Object.entries(userData).forEach(([key, value]) => {
            setValue(key, value);
          });
        } else {
          // If the user document doesn't exist, create it with default values
          const defaultUserData = {
            firstName: "",
            lastName: "",
            bio: "",
            preferences: { theme, language, notifications: true },
            socialLinks: { twitter: "", instagram: "", youtube: "" },
          };
          await setDoc(userDocRef, defaultUserData);
          Object.entries(defaultUserData).forEach(([key, value]) => {
            setValue(key, value);
          });
        }
        setValue("preferences.theme", theme);
        setValue("preferences.language", language);
        setAvatarPreview(currentUser.photoURL);
      }
    };
    fetchUserData();
  }, [currentUser, theme, language, setValue]);

  const onSubmit = useCallback(async (data) => {
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      await updateUserProfile({
        displayName: `${data.firstName} ${data.lastName}`,
      });
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, {
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
        preferences: data.preferences,
        socialLinks: data.socialLinks,
      }, { merge: true });
      setSuccessMessage(t("profileUpdatedSuccess"));
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage(t("profileUpdateError"));
    } finally {
      setIsLoading(false);
    }
  }, [updateUserProfile, currentUser?.uid, t]);

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
    const storageRef = ref(storage, `avatars/${currentUser.uid}`);

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

          const userDocRef = doc(db, "users", currentUser.uid);
          await setDoc(userDocRef, { avatar: downloadURL }, { merge: true });

          setSuccessMessage(t("avatarUpdateSuccess"));
          setIsLoading(false);
          setUploadProgress(0);
        }
      );
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setErrorMessage(t("avatarUpdateError"));
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [updateUserProfile, currentUser?.uid, t]);

  const memoizedImageUploader = useMemo(() => (
    <ImageUploader onImageUpload={handleImageUpload} />
  ), [handleImageUpload]);

  return (
    <Container>
      <Title>{t("userProfile")}</Title>
      {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}
      {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSection>
          <SectionTitle>{t("basicInfo")}</SectionTitle>
          {memoizedImageUploader}
          {avatarPreview && (
            <AvatarPreview
              src={avatarPreview}
              alt={t("userAvatar")}
            />
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <ProgressBar>
              <ProgressFill progress={uploadProgress} />
            </ProgressBar>
          )}
          <Input
            {...register("firstName")}
            placeholder={t("firstName")}
            aria-label={t("firstName")}
            aria-invalid={errors.firstName ? "true" : "false"}
          />
          {errors.firstName && <ErrorMessage role="alert">{errors.firstName.message}</ErrorMessage>}
          <Input
            {...register("lastName")}
            placeholder={t("lastName")}
            aria-label={t("lastName")}
            aria-invalid={errors.lastName ? "true" : "false"}
          />
          {errors.lastName && <ErrorMessage role="alert">{errors.lastName.message}</ErrorMessage>}
          <Textarea
            {...register("bio")}
            placeholder={t("bioPlaceholder")}
            aria-label={t("bio")}
            aria-invalid={errors.bio ? "true" : "false"}
          />
          {errors.bio && <ErrorMessage role="alert">{errors.bio.message}</ErrorMessage>}
        </FormSection>

        <FormSection>
          <SectionTitle>{t("settings")}</SectionTitle>
          <Select
            {...register("preferences.theme")}
            onChange={handlePreferenceChange}
            aria-label={t("theme")}
          >
            <option value="light">{t("lightTheme")}</option>
            <option value="dark">{t("darkTheme")}</option>
          </Select>
          <Select
            {...register("preferences.language")}
            onChange={handlePreferenceChange}
            aria-label={t("language")}
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </Select>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              {...register("preferences.notifications")}
              onChange={handlePreferenceChange}
              aria-label={t("notificationSettings")}
            />
            {t("receiveNotifications")}
          </CheckboxLabel>
        </FormSection>

        <FormSection>
          <SectionTitle>{t("socialLinks")}</SectionTitle>
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
          {isLoading ? t("updating") : t("updateProfile")}
        </Button>
      </Form>
    </Container>
  );
};

export default Profile;