import React, { useState } from 'react';
import styled from 'styled-components';
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, addDoc } from 'firebase/firestore';

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

const Message = styled.p`
  color: ${({ isError, theme }) => isError ? theme.colors.error : theme.colors.success};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  margin-top: ${({ theme }) => theme.spacing.medium};
`;

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const { db } = useFirebase();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        createdAt: new Date()
      });
      setMessage('お問い合わせありがとうございます。まもなくご連絡いたします。');
      setIsError(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setMessage('エラーが発生しました。後でもう一度お試しください。');
      setIsError(true);
    }
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
          <Input type="text" name="name" placeholder="お名前" required value={formData.name} onChange={handleChange} />
          <Input type="email" name="email" placeholder="メールアドレス" required value={formData.email} onChange={handleChange} />
          <Input type="text" name="subject" placeholder="件名" required value={formData.subject} onChange={handleChange} />
          <Textarea name="message" placeholder="お問い合わせ内容" required value={formData.message} onChange={handleChange} />
          <SubmitButton type="submit">送信</SubmitButton>
        </Form>
        {message && <Message isError={isError}>{message}</Message>}
      </Section>
    </ContactContainer>
  );
};

export default Contact;