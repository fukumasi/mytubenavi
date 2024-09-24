import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaCopyright, FaRegCopyright } from 'react-icons/fa';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';

const CopyrightContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.large};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxlarge};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    margin-right: ${({ theme }) => theme.spacing.small};
  }
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

const List = styled.ul`
  margin-left: ${({ theme }) => theme.spacing.large};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const ListItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.medium};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.small};
`;

const Copyright = () => {
  const [copyrightInfo, setCopyrightInfo] = useState(null);
  const { db } = useFirebase();

  useEffect(() => {
    const fetchCopyrightInfo = async () => {
      const docRef = doc(db, 'settings', 'copyright');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCopyrightInfo(docSnap.data());
      }
    };

    fetchCopyrightInfo();
  }, [db]);

  if (!copyrightInfo) {
    return <div>Loading...</div>;
  }

  return (
    <CopyrightContainer>
      <Title><FaCopyright /> {copyrightInfo.title || '著作権情報'}</Title>

      {copyrightInfo.sections.map((section, index) => (
        <Section key={index}>
          <SectionTitle>{section.title}</SectionTitle>
          <Paragraph>{section.content}</Paragraph>
          {section.list && (
            <List>
              {section.list.map((item, itemIndex) => (
                <ListItem key={itemIndex}>{item}</ListItem>
              ))}
            </List>
          )}
        </Section>
      ))}

      <Paragraph>
        <FaRegCopyright /> {copyrightInfo.footerText || '2024 MyTubeNavi. All rights reserved.'}
      </Paragraph>
    </CopyrightContainer>
  );
};

export default Copyright;