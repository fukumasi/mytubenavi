import React from 'react';
import styled from 'styled-components';

const PrivacyContainer = styled.div`
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

const Privacy = () => {
  return (
    <PrivacyContainer>
      <Title>プライバシーポリシー</Title>

      <Section>
        <SectionTitle>1. はじめに</SectionTitle>
        <Paragraph>
          MyTubeNavi（以下、「当社」）は、ユーザーの個人情報の保護を重要な責務と考えています。本プライバシーポリシーは、当社のサービス（以下、「本サービス」）におけるユーザーの個人情報の取り扱いについて説明します。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>2. 収集する情報</SectionTitle>
        <Paragraph>当社は以下の情報を収集する場合があります：</Paragraph>
        <List>
          <ListItem>氏名、メールアドレス、パスワードなどの登録情報</ListItem>
          <ListItem>IPアドレス、ブラウザの種類、アクセス日時などのログ情報</ListItem>
          <ListItem>検索履歴、視聴履歴などの利用情報</ListItem>
          <ListItem>アンケートやフィードバックで提供される情報</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>3. 情報の利用目的</SectionTitle>
        <Paragraph>収集した情報は以下の目的で利用されます：</Paragraph>
        <List>
          <ListItem>本サービスの提供と改善</ListItem>
          <ListItem>ユーザーサポートの提供</ListItem>
          <ListItem>新機能や更新情報の通知</ListItem>
          <ListItem>利用統計の作成と分析</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>4. 情報の共有</SectionTitle>
        <Paragraph>
          当社は、法令に基づく場合や、ユーザーの同意がある場合を除き、収集した個人情報を第三者と共有することはありません。ただし、以下の場合には情報を共有する場合があります：
        </Paragraph>
        <List>
          <ListItem>サービス提供に必要な業務委託先との共有</ListItem>
          <ListItem>当社の権利や財産を保護する必要がある場合</ListItem>
          <ListItem>ユーザーや公衆の安全を守るために必要な場合</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>5. 情報の保護</SectionTitle>
        <Paragraph>
          当社は、収集した個人情報の安全性を確保するために、適切な物理的、技術的、管理的措置を講じています。ただし、インターネット上での完全な安全性を保証することはできません。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>6. Cookieの使用</SectionTitle>
        <Paragraph>
          当社は、ユーザー体験の向上やサービスの改善のために、Cookieおよび類似の技術を使用することがあります。ユーザーはブラウザの設定でCookieを無効にすることができますが、一部のサービス機能が制限される場合があります。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>7. ユーザーの権利</SectionTitle>
        <Paragraph>ユーザーには以下の権利があります：</Paragraph>
        <List>
          <ListItem>個人情報へのアクセス、訂正、削除の要求</ListItem>
          <ListItem>個人情報の利用制限の要求</ListItem>
          <ListItem>個人情報の利用に関する同意の撤回</ListItem>
        </List>
      </Section>

      <Section>
        <SectionTitle>8. 子供のプライバシー</SectionTitle>
        <Paragraph>
          本サービスは13歳未満の子供を対象としていません。13歳未満の子供の個人情報を意図的に収集することはありません。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>9. プライバシーポリシーの変更</SectionTitle>
        <Paragraph>
          当社は、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、本サービス上で通知します。
        </Paragraph>
      </Section>

      <Section>
        <SectionTitle>10. お問い合わせ</SectionTitle>
        <Paragraph>
          本プライバシーポリシーに関するご質問やご意見は、以下の連絡先までお寄せください：
        </Paragraph>
        <Paragraph>
          メールアドレス: privacy@mytubenavi.com<br />
          郵送先: 〒100-0001 東京都千代田区千代田1-1 MyTubeNaviビル
        </Paragraph>
      </Section>

      <Paragraph>
        最終更新日：2024年4月1日
      </Paragraph>
    </PrivacyContainer>
  );
};

export default Privacy;