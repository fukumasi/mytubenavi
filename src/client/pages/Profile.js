import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const ProfileSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 10px;
`;

const ProfileInfo = styled.p`
  margin-bottom: 5px;
`;

const AvatarPreview = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
`;

const EditButton = styled(Link)`
  display: inline-block;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 5px;
`;

const Profile = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setProfileData(userDocSnap.data());
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  if (!profileData) {
    return <div>{t("loading")}</div>;
  }

  return (
    <Container>
      <Title>{t("userProfile")}</Title>
      <ProfileSection>
        <SectionTitle>{t("basicInfo")}</SectionTitle>
        {profileData.avatar && (
          <AvatarPreview src={profileData.avatar} alt={t("userAvatar")} />
        )}
        <ProfileInfo>{t("name")}: {profileData.firstName} {profileData.lastName}</ProfileInfo>
        <ProfileInfo>{t("email")}: {currentUser.email}</ProfileInfo>
        <ProfileInfo>{t("bio")}: {profileData.bio}</ProfileInfo>
      </ProfileSection>

      <ProfileSection>
        <SectionTitle>{t("preferences")}</SectionTitle>
        <ProfileInfo>{t("theme")}: {t(profileData.preferences?.theme || "lightTheme")}</ProfileInfo>
        <ProfileInfo>{t("language")}: {t(profileData.preferences?.language || "en")}</ProfileInfo>
        <ProfileInfo>{t("notifications")}: {profileData.preferences?.notifications ? t("enabled") : t("disabled")}</ProfileInfo>
      </ProfileSection>

      <ProfileSection>
        <SectionTitle>{t("socialLinks")}</SectionTitle>
        <ProfileInfo>Twitter: {profileData.socialLinks?.twitter || t("notProvided")}</ProfileInfo>
        <ProfileInfo>Instagram: {profileData.socialLinks?.instagram || t("notProvided")}</ProfileInfo>
        <ProfileInfo>YouTube: {profileData.socialLinks?.youtube || t("notProvided")}</ProfileInfo>
      </ProfileSection>

      <EditButton to="/edit-profile">{t("editProfile")}</EditButton>
    </Container>
  );
};

export default Profile;