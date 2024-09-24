import React from 'react';
import styled from 'styled-components';

const TermsContainer = styled.div`
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

const List = styled.ul`
  margin-left: ${({ theme }) => theme.spacing.large};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const ListItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.medium};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.small};
`;

const Terms = () => {
  const lastUpdated = new Date('2024-04-01').toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <TermsContainer>
      <Title>利用規約</Title>

      <Section>
        <SectionTitle>1. はじめに</SectionTitle>
        <Paragraph>
          この利用規約（以下、「本規約」）は、MyTubeNavi（以下、「当社」）が提供するサービス（以下、「本サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に従って本サービスをご利用いただきます。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>2. 定義</SectionTitle>
        <List>
          <ListItem>「ユーザー」とは、本サービスを利用する全ての個人または法人を指します。</ListItem>
          <ListItem>「コンテンツ」とは、テキスト、画像、動画、音声、およびその他の資料を含む、本サービスを通じてアクセス可能な情報を指します。</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>3. サービスの利用</SectionTitle>
        <Paragraph>
          ユーザーは、以下の条件に同意の上、本サービスを利用するものとします：
        </Paragraph>
        <List>
          <ListItem>本規約に違反しないこと</ListItem>
          <ListItem>法律、規則、または条例に違反しないこと</ListItem>
          <ListItem>他者の権利を侵害しないこと</ListItem>
          <ListItem>本サービスの運営を妨害しないこと</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>4. アカウント</SectionTitle>
        <Paragraph>
          ユーザーは、正確かつ完全な情報を提供してアカウントを作成し、その情報を最新に保つ責任があります。ユーザーは、アカウントの保護について全責任を負い、アカウントの不正使用があった場合は直ちに当社に通知するものとします。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>5. プライバシー</SectionTitle>
        <Paragraph>
          当社のプライバシーポリシーは、ユーザーの個人情報の収集、使用、開示に関する当社の方針を定めています。本サービスを利用することにより、ユーザーは当社のプライバシーポリシーに同意したものとみなされます。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>6. 知的財産権</SectionTitle>
        <Paragraph>
          本サービスおよび本サービスを通じて提供されるコンテンツ（ただし、ユーザーが作成したコンテンツを除く）に関する全ての知的財産権は、当社または当社にライセンスを許諾している者に帰属します。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>7. 免責事項</SectionTitle>
        <Paragraph>
          当社は、本サービスに関して、その完全性、正確性、確実性、有用性等について、いかなる保証も行いません。本サービスの利用により生じた損害について、当社は一切の責任を負いません。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>8. 規約の変更</SectionTitle>
        <Paragraph>
          当社は、必要と判断した場合には、ユーザーに通知することなく本規約を変更することができるものとします。変更後の利用規約は、本サービス上に表示した時点で効力を生じるものとします。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>9. 準拠法と管轄裁判所</SectionTitle>
        <Paragraph>
          本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
        </Paragraph>
      </Section>

      <Paragraph>
        最終更新日：{lastUpdated}
      </Paragraph>
    </TermsContainer>
  );
};

export default Terms;