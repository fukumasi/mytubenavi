import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useTranslation } from 'react-i18next';
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

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const Profile = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setProfileData(userDocSnap.data());
          } else {
            setError("User not found");
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Error fetching user data");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError("User not authenticated");
      }
    };

    fetchUserData();
  }, [currentUser]);

  if (loading) {
    return <Container>{t('loading')}</Container>;
  }

  if (error) {
    return <Container>{error}</Container>;
  }

  if (!profileData) {
    return <Container>{t('noProfileData')}</Container>;
  }

  const getThemeText = (theme) => {
    return theme === 'light' ? t('lightTheme') : t('darkTheme');
  };

  const getLanguageText = (lang) => {
    return lang === 'en' ? t('english') : t('japanese');
  };

  return (
    <Container>
      <Title>{t('profile')}</Title>

      <ProfileSection>
        <SectionTitle>{t('basicInfo')}</SectionTitle>
        {profileData.avatar && (
          <AvatarPreview src={profileData.avatar} alt={t('profilePicture')} />
        )}
        <ProfileInfo>{t('name')}: {profileData.firstName} {profileData.lastName}</ProfileInfo>
        <ProfileInfo>{t('email')}: {currentUser.email}</ProfileInfo>
        <ProfileInfo>{t('bio')}: {profileData.bio || t('noBioProvided')}</ProfileInfo>
      </ProfileSection>

      <ProfileSection>
        <SectionTitle>{t('preferences')}</SectionTitle>
        <ProfileInfo>{t('theme')}: {getThemeText(profileData.preferences?.theme)}</ProfileInfo>
        <ProfileInfo>{t('language')}: {getLanguageText(profileData.preferences?.language)}</ProfileInfo>
        <ProfileInfo>{t('notifications')}: {profileData.preferences?.notifications ? t('enabled') : t('disabled')}</ProfileInfo>
      </ProfileSection>

      <ProfileSection>
        <SectionTitle>{t('socialLinks')}</SectionTitle>
        <ProfileInfo>Twitter: {profileData.socialLinks?.twitter || t('notProvided')}</ProfileInfo>
        <ProfileInfo>Instagram: {profileData.socialLinks?.instagram || t('notProvided')}</ProfileInfo>
        <ProfileInfo>YouTube: {profileData.socialLinks?.youtube || t('notProvided')}</ProfileInfo>
      </ProfileSection>

      <EditButton to="/edit-profile">{t('editProfile')}</EditButton>

      <VisuallyHidden>
        {t('profileSummary', { 
          name: `${profileData.firstName} ${profileData.lastName}`, 
          email: currentUser.email 
        })}
      </VisuallyHidden>
    </Container>
  );
};

export default Profile;