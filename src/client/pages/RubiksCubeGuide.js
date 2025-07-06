import React from 'react';
import styled from 'styled-components';

const GuideContainer = styled.div`
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

const RubiksCubeGuide = () => (
  <GuideContainer>
    <Title>ルービックキューブのそろえ方</Title>

    <Section>
      <SectionTitle>1. 白いクロスを作る</SectionTitle>
      <Paragraph>
        最初に白面に十字を作ります。エッジの色が側面のセンターと揃うように調整します。
      </Paragraph>
    </Section>

    <Section>
      <SectionTitle>2. 一段目の角を揃える</SectionTitle>
      <Paragraph>
        白い十字を基準にして、四つの角を正しい位置に入れ、1段目を完成させます。
      </Paragraph>
    </Section>

    <Section>
      <SectionTitle>3. 二段目をそろえる</SectionTitle>
      <Paragraph>
        側面のエッジパーツを回して、上下の色が一致するように2段目を揃えます。
      </Paragraph>
    </Section>

    <Section>
      <SectionTitle>4. 上面のクロスを作る</SectionTitle>
      <Paragraph>
        公式を使って、上面に十字を作ります。黄色い面が上を向くようにします。
      </Paragraph>
    </Section>

    <Section>
      <SectionTitle>5. 上面の色を揃える</SectionTitle>
      <Paragraph>
        上面の色を揃え、エッジの位置を合わせます。必要に応じて何度か公式を繰り返します。
      </Paragraph>
    </Section>

    <Section>
      <SectionTitle>6. 最後の角をそろえて完成</SectionTitle>
      <Paragraph>
        残った角の向きと位置を合わせ、キューブ全体を完成させます。
      </Paragraph>
    </Section>
  </GuideContainer>
);

export default RubiksCubeGuide;
