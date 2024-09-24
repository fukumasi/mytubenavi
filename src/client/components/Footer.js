// src\client\components\Footer.js
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FaTwitter, FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';

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
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <FooterTitle>MyTubeNavi</FooterTitle>
          <FooterLink to="/">ホーム</FooterLink>
          <FooterLink to="/about">サービスについて</FooterLink>
          <FooterLink to="/contact">お問い合わせ</FooterLink>
        </FooterSection>
        <FooterSection>
          <FooterTitle>法的情報</FooterTitle>
          <FooterLink to="/terms">利用規約</FooterLink>
          <FooterLink to="/privacy">プライバシーポリシー</FooterLink>
          <FooterLink to="/copyright">著作権情報</FooterLink>
        </FooterSection>
        <FooterSection>
          <FooterTitle>フォローする</FooterTitle>
          <SocialIcons>
            <SocialIcon href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FaTwitter />
            </SocialIcon>
            <SocialIcon href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebook />
            </SocialIcon>
            <SocialIcon href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </SocialIcon>
            <SocialIcon href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <FaYoutube />
            </SocialIcon>
          </SocialIcons>
        </FooterSection>
      </FooterContent>
      <Copyright>
        &copy; {new Date().getFullYear()} MyTubeNavi. All rights reserved.
      </Copyright>
    </FooterContainer>
  );
};

export default Footer;