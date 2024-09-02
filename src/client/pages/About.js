import React from 'react';
import styled from 'styled-components';
import { FaSearch, FaThumbsUp, FaComments } from 'react-icons/fa';

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
  return (
    <AboutContainer>
      <Title>MyTubeNaviについて</Title>

      <Section>
        <SectionTitle>サービス概要</SectionTitle>
        <Paragraph>
          MyTubeNaviは、YouTube動画の検索とナビゲーションを効率化するアプリケーションです。
          ユーザーの興味に基づいて、最適な動画を簡単に見つけ、視聴することができます。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>主な特徴</SectionTitle>
        <FeatureList>
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
        </FeatureList>
      </Section>

      <Section>
        <SectionTitle>使い方</SectionTitle>
        <Paragraph>
          1. トップページの検索バーに興味のあるキーワードを入力します。
        </Paragraph>
        <Paragraph>
          2. 検索結果から気になる動画を選びます。必要に応じてフィルターを使用して結果を絞り込むことができます。
        </Paragraph>
        <Paragraph>
          3. 動画ページで動画を視聴し、関連する他の動画も探索できます。
        </Paragraph>
        <Paragraph>
          4. アカウントを作成すると、お気に入りの動画を保存したり、他のユーザーとコミュニケーションを取ったりすることができます。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>今後の展開</SectionTitle>
        <Paragraph>
          MyTubeNaviは常に進化し続けています。今後は、AIを活用したより精度の高いレコメンデーション機能や、
          動画制作者向けの分析ツールなど、さらに多くの機能を追加していく予定です。
        </Paragraph>
      </Section>
    </AboutContainer>
  );
};

export default About;