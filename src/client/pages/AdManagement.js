import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import AdVideoDisplay from '../components/AdVideoDisplay';
import AdStats from '../components/AdStats';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const AdList = styled.ul`
  list-style: none;
  padding: 0;
`;

const AdItem = styled.li`
  background-color: #f0f0f0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
`;

const AdHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const AdInfo = styled.div`
  flex-grow: 1;
`;

const AdTitle = styled.h3`
  margin: 0 0 5px 0;
`;

const AdDate = styled.p`
  margin: 0;
  font-size: 14px;
  color: #666;
`;

const Button = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;

  &:hover {
    background-color: #0056b3;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  font-weight: bold;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 20px auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ControlPanel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Select = styled.select`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const PageButton = styled.button`
  background-color: ${props => props.active ? '#007bff' : '#f0f0f0'};
  color: ${props => props.active ? 'white' : 'black'};
  border: none;
  padding: 5px 10px;
  margin: 0 5px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: ${props => props.active ? '#0056b3' : '#e0e0e0'};
  }
`;

const AdManagement = () => {
  const [ads, setAds] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAds();
  }, [sortBy, filterStatus, currentPage]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/ad-videos/my-ads', {
        params: { sortBy, status: filterStatus, page: currentPage }
      });
      setAds(response.data.data.adVideos);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      setError('広告の取得に失敗しました。');
      console.error('Error fetching ads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (adId) => {
    navigate(`/ad-edit/${adId}`);
  };

  const handleDelete = async (adId) => {
    if (window.confirm('この広告を削除してもよろしいですか？')) {
      try {
        await axios.delete(`/api/ad-videos/${adId}`);
        fetchAds();
      } catch (err) {
        setError('広告の削除に失敗しました。');
        console.error('Error deleting ad:', err);
      }
    }
  };

  const handleCreateNew = () => {
    navigate('/ad-create');
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <Container>
      <Title>広告管理</Title>
      <ControlPanel>
        <Button onClick={handleCreateNew}>新規広告作成</Button>
        <div>
          <Select value={sortBy} onChange={handleSortChange}>
            <option value="date">日付順</option>
            <option value="views">表示回数順</option>
            <option value="clicks">クリック数順</option>
          </Select>
          <Select value={filterStatus} onChange={handleFilterChange}>
            <option value="all">すべて</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
          </Select>
        </div>
      </ControlPanel>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <AdList>
            {ads.map((ad) => (
              <AdItem key={ad._id}>
                <AdHeader>
                  <AdInfo>
                    <AdTitle>{ad.title}</AdTitle>
                    <AdDate>表示日: {new Date(ad.displayDate).toLocaleDateString()}</AdDate>
                  </AdInfo>
                  <div>
                    <Button onClick={() => handleEdit(ad._id)}>編集</Button>
                    <Button onClick={() => handleDelete(ad._id)}>削除</Button>
                  </div>
                </AdHeader>
                <AdStats adId={ad._id} />
                <AdVideoDisplay adId={ad._id} />
              </AdItem>
            ))}
          </AdList>
          <Pagination>
            {[...Array(totalPages).keys()].map((page) => (
              <PageButton
                key={page + 1}
                active={currentPage === page + 1}
                onClick={() => handlePageChange(page + 1)}
              >
                {page + 1}
              </PageButton>
            ))}
          </Pagination>
        </>
      )}
    </Container>
  );
};

export default AdManagement;

// TODO: 広告パフォーマンスの概要ダッシュボード
// TODO: 複数の広告を一括で編集/削除する機能
// TODO: 広告のプレビュー機能
// TODO: 広告のスケジュール設定機能
// TODO: 広告のターゲティング設定（地域、年齢層など）
// TODO: 広告のA/Bテスト機能
// TODO: 広告の自動最適化機能
// TODO: レポート生成機能（PDF, CSV出力）
// TODO: 広告のキーワード分析機能
// TODO: 競合他社の広告分析機能
// TODO: 広告予算管理機能
// TODO: リアルタイム広告パフォーマンス監視
// TODO: 広告クリエイティブのライブラリ機能
// TODO: 広告のコメント/フィードバック管理機能
// TODO: 広告の承認ワークフロー