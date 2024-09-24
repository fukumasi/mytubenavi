import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import AdVideoDisplay from '../components/AdVideoDisplay';
import AdStats from '../components/AdStats';
import AdDashboard from '../components/AdDashboard';
import AdPreview from '../components/AdPreview';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useFirebase } from '../contexts/FirebaseContext';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, orderBy, limit, startAfter, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

// Styled components remain unchanged...

const AdManagement = () => {
  const [ads, setAds] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAds, setSelectedAds] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAdId, setPreviewAdId] = useState(null);
  const [scheduleStart, setScheduleStart] = useState(new Date());
  const [scheduleEnd, setScheduleEnd] = useState(new Date());
  const navigate = useNavigate();
  const { db } = useFirebase();
  const { user } = useAuth();

  useEffect(() => {
    fetchAds();
  }, [sortBy, filterStatus, currentPage]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const adsRef = collection(db, 'ad-videos');
      let q = query(adsRef, where('userId', '==', user.uid));

      if (filterStatus !== 'all') {
        q = query(q, where('status', '==', filterStatus));
      }

      if (sortBy === 'date') {
        q = query(q, orderBy('createdAt', 'desc'));
      } else if (sortBy === 'views') {
        q = query(q, orderBy('views', 'desc'));
      } else if (sortBy === 'clicks') {
        q = query(q, orderBy('clicks', 'desc'));
      }

      q = query(q, limit(10), startAfter((currentPage - 1) * 10));

      const querySnapshot = await getDocs(q);
      const fetchedAds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(fetchedAds);

      // Calculate total pages (this is an estimation)
      const totalAdsQuery = query(adsRef, where('userId', '==', user.uid));
      const totalAdsSnapshot = await getDocs(totalAdsQuery);
      setTotalPages(Math.ceil(totalAdsSnapshot.size / 10));
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
        await deleteDoc(doc(db, 'ad-videos', adId));
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

  const handleSelectAd = (adId) => {
    setSelectedAds(prev => 
      prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId]
    );
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`選択された${selectedAds.length}件の広告を削除してもよろしいですか？`)) {
      try {
        await Promise.all(selectedAds.map(adId => deleteDoc(doc(db, 'ad-videos', adId))));
        fetchAds();
        setSelectedAds([]);
      } catch (err) {
        setError('広告の一括削除に失敗しました。');
        console.error('Error bulk deleting ads:', err);
      }
    }
  };

  const handlePreview = (adId) => {
    setPreviewAdId(adId);
    setShowPreview(true);
  };

  const handleSchedule = async () => {
    try {
      await Promise.all(selectedAds.map(adId => 
        updateDoc(doc(db, 'ad-videos', adId), { 
          scheduleStart: scheduleStart, 
          scheduleEnd: scheduleEnd 
        })
      ));
      fetchAds();
      setSelectedAds([]);
    } catch (err) {
      setError('広告のスケジュール設定に失敗しました。');
      console.error('Error scheduling ads:', err);
    }
  };

  return (
    <Container>
      <Title>広告管理</Title>
      <AdDashboard />
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
      {selectedAds.length > 0 && (
        <div>
          <Button onClick={handleBulkDelete}>選択した広告を削除</Button>
          <ScheduleContainer>
            <DatePicker selected={scheduleStart} onChange={date => setScheduleStart(date)} />
            <DatePicker selected={scheduleEnd} onChange={date => setScheduleEnd(date)} />
            <Button onClick={handleSchedule}>スケジュール設定</Button>
          </ScheduleContainer>
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <AdList>
            {ads.map((ad) => (
              <AdItem key={ad.id}>
                <CheckboxContainer>
                  <Checkbox
                    type="checkbox"
                    checked={selectedAds.includes(ad.id)}
                    onChange={() => handleSelectAd(ad.id)}
                  />
                  <AdHeader>
                    <AdInfo>
                      <AdTitle>{ad.title}</AdTitle>
                      <AdDate>表示日: {ad.displayDate.toDate().toLocaleDateString()}</AdDate>
                    </AdInfo>
                    <div>
                      <Button onClick={() => handlePreview(ad.id)}>プレビュー</Button>
                      <Button onClick={() => handleEdit(ad.id)}>編集</Button>
                      <Button onClick={() => handleDelete(ad.id)}>削除</Button>
                    </div>
                  </AdHeader>
                </CheckboxContainer>
                <AdStats adId={ad.id} />
                <AdVideoDisplay adId={ad.id} />
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
      {showPreview && <AdPreview adId={previewAdId} onClose={() => setShowPreview(false)} />}
    </Container>
  );
};

export default AdManagement;

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