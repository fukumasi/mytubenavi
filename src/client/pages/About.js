import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaSearch, FaThumbsUp, FaComments } from 'react-icons/fa';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';

const AboutContainer = styled.div`
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

const FeatureList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  font-size: ${({ theme }) => theme.fontSizes.medium};

  svg {
    margin-right: ${({ theme }) => theme.spacing.small};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const About = () => {
  const [aboutContent, setAboutContent] = useState(null);
  const { db } = useFirebase();

  useEffect(() => {
    const fetchAboutContent = async () => {
      const aboutDocRef = doc(db, 'content', 'about');
      const aboutDocSnap = await getDoc(aboutDocRef);
      if (aboutDocSnap.exists()) {
        setAboutContent(aboutDocSnap.data());
      }
    };

    fetchAboutContent();
  }, [db]);

  if (!aboutContent) {
    return <div>Loading...</div>;
  }

  return (
    <AboutContainer>
      <Title>{aboutContent.title || 'MyTubeNaviについて'}</Title>

      <Section>
        <SectionTitle>{aboutContent.serviceSummary?.title || 'サービス概要'}</SectionTitle>
        <Paragraph>{aboutContent.serviceSummary?.content || 'MyTubeNaviは、YouTube動画の検索とナビゲーションを効率化するアプリケーションです。ユーザーの興味に基づいて、最適な動画を簡単に見つけ、視聴することができます。'}</Paragraph>
      </Section>

      <Section>
        <SectionTitle>{aboutContent.features?.title || '主な特徴'}</SectionTitle>
        <FeatureList>
          {aboutContent.features?.list.map((feature, index) => (
            <FeatureItem key={index}>
              {feature.icon === 'FaSearch' && <FaSearch />}
              {feature.icon === 'FaThumbsUp' && <FaThumbsUp />}
              {feature.icon === 'FaComments' && <FaComments />}
              {feature.text}
            </FeatureItem>
          )) || (
            <>
              <FeatureItem>
                <FaSearch />
                高度な検索機能：カテゴリー、再生時間、アップロード日などで絞り込み
              </FeatureItem>
              <FeatureItem>
                <FaThumbsUp />
                パーソナライズされたレコメンデーション
              </FeatureItem>
              <FeatureItem>
                <FaComments />
                コミュニティ機能：ユーザー同士での動画の共有や議論
              </FeatureItem>
            </>
          )}
        </FeatureList>
      </Section>

      <Section>
        <SectionTitle>{aboutContent.howToUse?.title || '使い方'}</SectionTitle>
        {aboutContent.howToUse?.steps.map((step, index) => (
          <Paragraph key={index}>{`${index + 1}. ${step}`}</Paragraph>
        )) || (
          <>
            <Paragraph>1. トップページの検索バーに興味のあるキーワードを入力します。</Paragraph>
            <Paragraph>2. 検索結果から気になる動画を選びます。必要に応じてフィルターを使用して結果を絞り込むことができます。</Paragraph>
            <Paragraph>3. 動画ページで動画を視聴し、関連する他の動画も探索できます。</Paragraph>
            <Paragraph>4. アカウントを作成すると、お気に入りの動画を保存したり、他のユーザーとコミュニケーションを取ったりすることができます。</Paragraph>
          </>
        )}
      </Section>

      <Section>
        <SectionTitle>{aboutContent.futurePlans?.title || '今後の展開'}</SectionTitle>
        <Paragraph>{aboutContent.futurePlans?.content || 'MyTubeNaviは常に進化し続けています。今後は、AIを活用したより精度の高いレコメンデーション機能や、動画制作者向けの分析ツールなど、さらに多くの機能を追加していく予定です。'}</Paragraph>
      </Section>
    </AboutContainer>
  );
};

export default About;