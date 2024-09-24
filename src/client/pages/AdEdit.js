import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import AdPayment from '../components/AdPayment';
import AdVideoDisplay from '../components/AdVideoDisplay';
import { FaSave, FaTimes } from 'react-icons/fa';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Styled components remain unchanged...

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const CancelButton = styled(Button)`
  background-color: #dc3545;

  &:hover {
    background-color: #c82333;
  }
`;

const AdEdit = () => {
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    displayDateStart: '',
    displayDateEnd: '',
    price: '',
    description: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();
  const { db } = useFirebase();

  const fetchAdData = useCallback(async () => {
    try {
      setIsLoading(true);
      const adDocRef = doc(db, 'ad-videos', id);
      const adDocSnap = await getDoc(adDocRef);
      if (adDocSnap.exists()) {
        const adData = adDocSnap.data();
        setFormData({
          youtubeUrl: `https://www.youtube.com/watch?v=${adData.youtubeId}`,
          displayDateStart: new Date(adData.displayDateStart.toDate()).toISOString().split('T')[0],
          displayDateEnd: new Date(adData.displayDateEnd.toDate()).toISOString().split('T')[0],
          price: adData.price,
          description: adData.description
        });
        setIsPaid(adData.isPaid);
      } else {
        setError('広告が見つかりません。');
      }
    } catch (err) {
      setError('広告データの取得に失敗しました。');
      console.error('Error fetching ad data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, db]);

  useEffect(() => {
    fetchAdData();
  }, [fetchAdData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const adDocRef = doc(db, 'ad-videos', id);
      await updateDoc(adDocRef, {
        displayDateStart: new Date(formData.displayDateStart),
        displayDateEnd: new Date(formData.displayDateEnd),
        price: formData.price,
        description: formData.description
      });
      setSuccess('広告が正常に更新されました。');
      setTimeout(() => navigate('/ad-management'), 2000);
    } catch (err) {
      setError('広告の更新に失敗しました。');
      console.error('Error updating ad:', err);
    }
  };

  const handlePaymentComplete = useCallback(() => {
    setIsPaid(true);
    setSuccess('支払いが完了し、広告がアクティブになりました。');
  }, []);

  const handleCancel = useCallback(() => {
    navigate('/ad-management');
  }, [navigate]);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <Container>
      <Title>広告編集</Title>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      <Form onSubmit={handleSubmit}>
        <Label htmlFor="youtubeUrl">YouTube URL:</Label>
        <Input
          type="url"
          id="youtubeUrl"
          name="youtubeUrl"
          value={formData.youtubeUrl}
          onChange={handleChange}
          required
          disabled
        />

        <Label htmlFor="displayDateStart">表示開始日:</Label>
        <Input
          type="date"
          id="displayDateStart"
          name="displayDateStart"
          value={formData.displayDateStart}
          onChange={handleChange}
          required
        />

        <Label htmlFor="displayDateEnd">表示終了日:</Label>
        <Input
          type="date"
          id="displayDateEnd"
          name="displayDateEnd"
          value={formData.displayDateEnd}
          onChange={handleChange}
          required
        />

        <Label htmlFor="price">価格:</Label>
        <Input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          required
          min="0"
        />

        <Label htmlFor="description">説明:</Label>
        <TextArea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <ButtonGroup>
          <Button type="submit"><FaSave /> 広告を更新</Button>
          <CancelButton type="button" onClick={handleCancel}><FaTimes /> キャンセル</CancelButton>
        </ButtonGroup>
      </Form>

      <PreviewContainer>
        <h2>広告プレビュー</h2>
        <AdVideoDisplay adId={id} />
      </PreviewContainer>

      {!isPaid && (
        <AdPayment
          adId={id}
          price={formData.price}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </Container>
  );
};

export default React.memo(AdEdit);

// TODO: エラーハンドリングの改善
// TODO: フォームのバリデーション強化
// TODO: ユーザーフィードバックの改善（例：トースト通知）
// TODO: 広告のプレビュー機能の拡張
// TODO: 広告編集履歴の追跡
// TODO: 広告の公開/非公開切り替え機能
// TODO: 広告のパフォーマンス分析機能
// TODO: 広告のターゲティング設定の編集
// TODO: 支払い情報の更新機能
// TODO: 広告の複製機能
// TODO: 広告の一時停止/再開機能
// TODO: 関連広告の提案機能
// TODO: 広告の自動最適化機能