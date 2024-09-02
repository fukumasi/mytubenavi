import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import AdPayment from '../components/AdPayment';
import AdVideoDisplay from '../components/AdVideoDisplay';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.input`
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  min-height: 100px;
`;

const Button = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #0056b3;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  font-weight: bold;
`;

const SuccessMessage = styled.p`
  color: green;
  font-weight: bold;
`;

const PreviewContainer = styled.div`
  margin-top: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 15px;
`;

const AdEdit = () => {
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    displayDate: '',
    price: '',
    description: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchAdData = async () => {
      try {
        const response = await axios.get(`/api/ad-videos/${id}`);
        const adData = response.data.data.adVideo;
        setFormData({
          youtubeUrl: `https://www.youtube.com/watch?v=${adData.youtubeId}`,
          displayDate: new Date(adData.displayDate).toISOString().split('T')[0],
          price: adData.price,
          description: adData.description
        });
        setIsPaid(adData.isPaid);
      } catch (err) {
        setError('広告データの取得に失敗しました。');
        console.error('Error fetching ad data:', err);
      }
    };

    fetchAdData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await axios.patch(`/api/ad-videos/${id}`, formData);
      setSuccess('広告が正常に更新されました。');
    } catch (err) {
      setError('広告の更新に失敗しました。');
      console.error('Error updating ad:', err);
    }
  };

  const handlePaymentComplete = () => {
    setIsPaid(true);
    setSuccess('支払いが完了し、広告がアクティブになりました。');
  };

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

        <Label htmlFor="displayDate">表示日:</Label>
        <Input
          type="date"
          id="displayDate"
          name="displayDate"
          value={formData.displayDate}
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

        <Button type="submit">広告を更新</Button>
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

export default AdEdit;

// 将来的な機能拡張のためのコメント
// TODO: 広告のパフォーマンス指標（表示回数、クリック数など）の表示
// TODO: 広告の有効/無効切り替え機能の追加
// TODO: 広告の複製機能の実装
// TODO: 履歴管理機能の追加
// TODO: 広告のスケジュール機能の追加（開始日と終了日の設定）
// TODO: 広告のターゲティング設定（地域、年齢層、興味関心など）
// TODO: 広告の自動最適化機能（パフォーマンスに基づいて表示回数を調整）
// TODO: 複数の広告クリエイティブの管理（A/Bテスト）
// TODO: 広告レポートの自動生成と定期的な送信機能

// プレースホルダーコメント（行数を維持するため）
// ...
// ...
// ...