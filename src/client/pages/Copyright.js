import React from 'react';
import styled from 'styled-components';
import { FaCopyright, FaRegCopyright } from 'react-icons/fa';

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
  return (
    <CopyrightContainer>
      <Title><FaCopyright /> 著作権情報</Title>

      <Section>
        <SectionTitle>1. 著作権の帰属</SectionTitle>
        <Paragraph>
          MyTubeNavi（以下、「当社」）のウェブサイト、アプリケーション、およびサービス（以下、総称して「本サービス」）に含まれるすべてのコンテンツ（テキスト、画像、動画、音声、デザイン、ソフトウェアなど）は、特に明記しない限り、当社または当社にライセンスを許諾している者が著作権を有します。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>2. 利用制限</SectionTitle>
        <Paragraph>
          本サービスのコンテンツは、個人的、非商業的な目的でのみ利用することができます。以下の行為は、当社の書面による事前の許可なく行うことはできません：
        </Paragraph>
        <List>
          <ListItem>本サービスのコンテンツの複製、配布、公開、または送信</ListItem>
          <ListItem>本サービスのコンテンツの改変または二次的著作物の作成</ListItem>
          <ListItem>本サービスのコンテンツの商業的利用</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>3. ユーザーが投稿したコンテンツ</SectionTitle>
        <Paragraph>
          ユーザーが本サービスに投稿したコンテンツ（コメント、レビュー、画像など）の著作権は、そのユーザーに帰属します。ただし、ユーザーは当社に対し、そのコンテンツを本サービスの運営、改善、プロモーションのために利用する非独占的、世界的、無償のライセンスを付与するものとします。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>4. 第三者の著作権</SectionTitle>
        <Paragraph>
          本サービスでは、YouTube APIサービスを通じて提供される動画コンテンツへのアクセスを提供しています。これらの動画の著作権は、各動画の作成者または権利者に帰属します。当社は、これらの動画の内容について責任を負いません。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>5. 著作権侵害の報告</SectionTitle>
        <Paragraph>
          本サービス上で著作権侵害を発見された場合は、以下の情報を含めて当社にご連絡ください：
        </Paragraph>
        <List>
          <ListItem>侵害されている著作物の特定</ListItem>
          <ListItem>侵害コンテンツの場所（URL）</ListItem>
          <ListItem>連絡先情報</ListItem>
          <ListItem>侵害の申し立てが誠実であることの宣言</ListItem>
        </List>
        <Paragraph>
          連絡先: copyright@mytubenavi.com
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>6. 商標</SectionTitle>
        <Paragraph>
          MyTubeNaviおよび関連するロゴは、当社の商標または登録商標です。本サービスで言及されるその他の製品名、ブランド名、会社名は、それぞれの所有者の商標である可能性があります。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>7. 変更</SectionTitle>
        <Paragraph>
          当社は、必要に応じてこの著作権情報を変更する権利を留保します。変更があった場合は、本ページで通知します。
        </Paragraph>
      </Section>

      <Paragraph>
        <FaRegCopyright /> 2024 MyTubeNavi. All rights reserved.
      </Paragraph>
    </CopyrightContainer>
  );
};

export default Copyright;