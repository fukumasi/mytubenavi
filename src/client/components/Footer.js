// src\client\components\Footer.js
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FaTwitter, FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const FooterContainer = styled.footer`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.large} 0;
`;

const FooterContent = styled.div`
  max-width: ${({ theme }) => theme.maxWidth};
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0 ${({ theme }) => theme.spacing.medium};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: center;
  }
`;

const FooterSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.large};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    text-align: center;
    margin-bottom: ${({ theme }) => theme.spacing.medium};
  }
`;

const FooterTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.medium};
  margin-bottom: ${({ theme }) => theme.spacing.small};
`;

const FooterLink = styled(Link)`
  display: block;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  margin-bottom: ${({ theme }) => theme.spacing.small};
  transition: color 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const SocialIcons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};
  margin-top: ${({ theme }) => theme.spacing.small};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    justify-content: center;
  }
`;

const SocialIcon = styled.a`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.large};
  transition: color 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Copyright = styled.p`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.large};
  padding-top: ${({ theme }) => theme.spacing.medium};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Footer = () => {
  const { t } = useTranslation();

  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <FooterTitle>{t('footer.appName')}</FooterTitle>
          <FooterLink to="/">{t('footer.home')}</FooterLink>
          <FooterLink to="/about">{t('footer.about')}</FooterLink>
          <FooterLink to="/contact">{t('footer.contact')}</FooterLink>
        </FooterSection>
        <FooterSection>
          <FooterTitle>{t('footer.legalInfo')}</FooterTitle>
          <FooterLink to="/terms">{t('footer.terms')}</FooterLink>
          <FooterLink to="/privacy">{t('footer.privacy')}</FooterLink>
          <FooterLink to="/copyright">{t('footer.copyright')}</FooterLink>
        </FooterSection>
        <FooterSection>
          <FooterTitle>{t('footer.followUs')}</FooterTitle>
          <SocialIcons>
            <SocialIcon href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label={t('footer.twitter')}>
              <FaTwitter />
            </SocialIcon>
            <SocialIcon href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label={t('footer.facebook')}>
              <FaFacebook />
            </SocialIcon>
            <SocialIcon href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label={t('footer.instagram')}>
              <FaInstagram />
            </SocialIcon>
            <SocialIcon href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label={t('footer.youtube')}>
              <FaYoutube />
            </SocialIcon>
          </SocialIcons>
        </FooterSection>
      </FooterContent>
      <Copyright>
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </Copyright>
    </FooterContainer>
  );
};

export default Footer;