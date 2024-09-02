import React from 'react';
import styled from 'styled-components';
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const ContactContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.large};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxlarge};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  text-align: center;
`;

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xlarge};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xlarge};
  color: ${({ theme }) => theme.colors.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const Paragraph = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.medium};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.fontSizes.medium};

  svg {
    margin-right: ${({ theme }) => theme.spacing.small};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.small};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const Textarea = styled.textarea`
  padding: ${({ theme }) => theme.spacing.small};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  min-height: 150px;
`;

const SubmitButton = styled.button`
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const Contact = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // フォーム送信のロジックをここに実装
    alert('お問い合わせありがとうございます。まもなくご連絡いたします。');
  };

  return (
    <ContactContainer>
      <Title>お問い合わせ</Title>

      <Section>
        <SectionTitle>お問い合わせ方法</SectionTitle>
        <Paragraph>
          MyTubeNaviに関するご質問、ご意見、お問い合わせは以下の方法でお受けしています。
        </Paragraph>
        <ContactInfo>
          <ContactItem>
            <FaEnvelope />
            support@mytubenavi.com
          </ContactItem>
          <ContactItem>
            <FaPhone />
            0120-XXX-XXX（平日 9:00-18:00）
          </ContactItem>
          <ContactItem>
            <FaMapMarkerAlt />
            〒100-0001 東京都千代田区千代田1-1 MyTubeNaviビル
          </ContactItem>
        </ContactInfo>
      </Section>

      <Section>
        <SectionTitle>お問い合わせフォーム</SectionTitle>
        <Form onSubmit={handleSubmit}>
          <Input type="text" placeholder="お名前" required />
          <Input type="email" placeholder="メールアドレス" required />
          <Input type="text" placeholder="件名" required />
          <Textarea placeholder="お問い合わせ内容" required />
          <SubmitButton type="submit">送信</SubmitButton>
        </Form>
      </Section>
    </ContactContainer>
  );
};

export default Contact;