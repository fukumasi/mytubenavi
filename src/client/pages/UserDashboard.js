import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';  // この行を変更
import { FaUser, FaAd, FaHistory, FaCog, FaSearch, FaVideo } from 'react-icons/fa';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const DashboardTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const DashboardSection = styled.section`
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UserInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;

const InfoItem = styled.div`
  background-color: white;
  padding: 10px;
  border-radius: 4px;
`;

const InfoLabel = styled.span`
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
`;

const InfoValue = styled.span`
  display: block;
`;

const ButtonLink = styled(Link)`
  display: inline-block;
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  text-decoration: none;
  margin-top: 10px;

  &:hover {
    background-color: #0056b3;
  }
`;

const ActivityList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const ActivityItem = styled.li`
  background-color: white;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
`;

const SearchHistoryList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const SearchHistoryItem = styled.li`
  background-color: white;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RecommendedVideosList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;

const RecommendedVideoItem = styled.div`
  background-color: white;
  padding: 10px;
  border-radius: 4px;
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: auto;
  border-radius: 4px;
`;

const VideoTitle = styled.h3`
  font-size: 14px;
  margin: 10px 0 5px;
`;

const VideoChannel = styled.p`
  font-size: 12px;
  color: #666;
`;

const SettingsList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const SettingsItem = styled.li`
  margin-bottom: 10px;
`;

const UserDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    loginHistory: [],
    searchHistory: [],
    recommendedVideos: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setDashboardData(prevData => ({
          ...prevData,
          ...userData,
          loginHistory: userData.loginHistory || [],
          searchHistory: userData.searchHistory || [],
          recommendedVideos: userData.recommendedVideos || []
        }));
      } else {
        throw new Error('ユーザーデータが見つかりません。');
      }
    } catch (err) {
      setError('ダッシュボードデータの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const { loginHistory, searchHistory, recommendedVideos } = dashboardData;

  return (
    <DashboardContainer>
      <DashboardTitle>ユーザーダッシュボード</DashboardTitle>

      <DashboardSection>
        <SectionTitle><FaUser /> ユーザー情報</SectionTitle>
        <UserInfo>
          <InfoItem>
            <InfoLabel>ユーザー名</InfoLabel>
            <InfoValue>{user.displayName || 'Not set'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>メールアドレス</InfoLabel>
            <InfoValue>{user.email}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>アカウント作成日</InfoLabel>
            <InfoValue>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>メール認証</InfoLabel>
            <InfoValue>{user.emailVerified ? '完了' : '未完了'}</InfoValue>
            {!user.emailVerified && (
              <ButtonLink to="/verify-email">メールアドレスを認証する</ButtonLink>
            )}
          </InfoItem>
        </UserInfo>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaHistory /> 最近のログイン履歴</SectionTitle>
        <ActivityList>
          {loginHistory.slice(0, 5).map((login, index) => (
            <ActivityItem key={index}>
              {new Date(login.timestamp.toDate()).toLocaleString()} - {login.ipAddress}
            </ActivityItem>
          ))}
        </ActivityList>
        <ButtonLink to="/login-history">すべてのログイン履歴を表示</ButtonLink>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaSearch /> 最近の検索履歴</SectionTitle>
        <SearchHistoryList>
          {searchHistory.slice(0, 5).map((search, index) => (
            <SearchHistoryItem key={index}>
              <span>{search.query}</span>
              <small>{new Date(search.timestamp.toDate()).toLocaleString()}</small>
            </SearchHistoryItem>
          ))}
        </SearchHistoryList>
        <ButtonLink to="/search-history">すべての検索履歴を表示</ButtonLink>
      </DashboardSection>

      <DashboardSection>
        <SectionTitle><FaVideo /> おすすめ動画</SectionTitle>
        <RecommendedVideosList>
          {recommendedVideos.slice(0, 6).map((video, index) => (
            <RecommendedVideoItem key={index}>
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

export default React.memo(UserDashboard);

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