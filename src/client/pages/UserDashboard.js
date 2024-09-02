import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaLock, FaAd, FaHistory, FaCog, FaSearch, FaVideo } from 'react-icons/fa';
import api from '../utils/api';

const DashboardContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const DashboardTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.primary};
`;

const DashboardSection = styled.section`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const InfoItem = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const InfoLabel = styled.span`
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const InfoValue = styled.span`
  display: block;
  color: ${({ theme }) => theme.colors.text};
`;

const ButtonLink = styled(Link)`
  display: inline-block;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  text-decoration: none;
  margin-top: 10px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const ActivityList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const ActivityItem = styled.li`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SettingsList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const SettingsItem = styled.li`
  margin-bottom: 15px;
`;

const SearchHistoryList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const SearchHistoryItem = styled.li`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RecommendedVideosList = styled.ul`
  list-style-type: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;

const RecommendedVideoItem = styled.li`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: auto;
  border-radius: 4px;
`;

const VideoTitle = styled.h3`
  font-size: 1rem;
  margin: 10px 0 5px;
`;

const VideoChannel = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textLight};
`;

const LoadingMessage = styled.p`
  color: ${({ theme }) => theme.colors.textLight};
  text-align: center;
  padding: 20px;
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  text-align: center;
  padding: 20px;
`;

const UserDashboard = () => {
  const { user } = useAuth();
  const [loginHistory, setLoginHistory] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [loginHistoryResponse, searchHistoryResponse, recommendedVideosResponse] = await Promise.all([
          api.get('/user/login-history'),
          api.get('/user/search-history'),
          api.get('/user/recommended-videos')
        ]);

        setLoginHistory(loginHistoryResponse.data);
        setSearchHistory(searchHistoryResponse.data);
        setRecommendedVideos(recommendedVideosResponse.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('ダッシュボードデータの取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingMessage>データを読み込んでいます...</LoadingMessage>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  return (
    <DashboardContainer>
      <DashboardTitle>ユーザーダッシュボード</DashboardTitle>

      <DashboardSection>
        <SectionTitle><FaUser /> ユーザー情報</SectionTitle>
        <UserInfo>
          <InfoItem>
            <InfoLabel>ユーザー名</InfoLabel>
            <InfoValue>{user.username}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>メールアドレス</InfoLabel>
            <InfoValue>{user.email}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>アカウント作成日</InfoLabel>
            <InfoValue>{new Date(user.createdAt).toLocaleDateString()}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>2要素認証</InfoLabel>
            <InfoValue>{user.isTwoFactorEnabled ? '有効' : '無効'}</InfoValue>
            <ButtonLink to="/two-factor-auth">
              {user.isTwoFactorEnabled ? '2要素認証を無効にする' : '2要素認証を有効にする'}
            </ButtonLink>
          </InfoItem>
        </UserInfo>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaHistory /> 最近のログイン履歴</SectionTitle>
        <ActivityList>
          {loginHistory.slice(0, 5).map((login, index) => (
            <ActivityItem key={index}>
              {new Date(login.timestamp).toLocaleString()} - {login.ipAddress}
            </ActivityItem>
          ))}
        </ActivityList>
        <ButtonLink to="/login-history">すべてのログイン履歴を表示</ButtonLink>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaSearch /> 最近の検索履歴</SectionTitle>
        <SearchHistoryList>
          {searchHistory.slice(0, 5).map((search) => (
            <SearchHistoryItem key={search._id}>
              <span>{search.query}</span>
              <small>{new Date(search.timestamp).toLocaleString()}</small>
            </SearchHistoryItem>
          ))}
        </SearchHistoryList>
        <ButtonLink to="/search-history">すべての検索履歴を表示</ButtonLink>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaVideo /> おすすめ動画</SectionTitle>
        <RecommendedVideosList>
          {recommendedVideos.slice(0, 6).map((video) => (
            <RecommendedVideoItem key={video._id}>
              <VideoThumbnail src={video.thumbnail} alt={video.title} />
              <VideoTitle>{video.title}</VideoTitle>
              <VideoChannel>{video.channel.name}</VideoChannel>
            </RecommendedVideoItem>
          ))}
        </RecommendedVideosList>
        <ButtonLink to="/recommended">もっと見る</ButtonLink>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaAd /> 広告管理</SectionTitle>
        <p>あなたの広告キャンペーンを管理します。</p>
        <ButtonLink to="/ad-management">広告管理ページへ</ButtonLink>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaCog /> アカウント設定</SectionTitle>
        <SettingsList>
          <SettingsItem>
            <ButtonLink to="/profile">プロフィール編集</ButtonLink>
          </SettingsItem>
          <SettingsItem>
            <ButtonLink to="/change-password">パスワード変更</ButtonLink>
          </SettingsItem>
          <SettingsItem>
            <ButtonLink to="/privacy-settings">プライバシー設定</ButtonLink>
          </SettingsItem>
        </SettingsList>
      </DashboardSection>
    </DashboardContainer>
  );
};

export default UserDashboard;

// 将来的な機能拡張のためのコメント
// TODO: ユーザーの視聴履歴セクションの追加
// TODO: お気に入り動画リストの表示
// TODO: ユーザーの投稿したコメントの表示
// TODO: アカウントの削除オプションの追加
// TODO: ダッシュボードのカスタマイズ機能の実装
// TODO: 通知設定の追加
// TODO: API使用量の表示（開発者向け）
// TODO: サブスクリプション管理セクションの追加
// TODO: 検索履歴の削除機能の実装
// TODO: おすすめ動画のパーソナライズ機能の強化