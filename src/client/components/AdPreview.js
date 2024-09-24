// src\client\components\AdPreview.js
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaTimes } from 'react-icons/fa';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const PreviewContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PreviewContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 80%;
  max-height: 80%;
  overflow-y: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #333;
  transition: color 0.3s ease;

  &:hover {
    color: #000;
  }
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; // 16:9 aspect ratio
  margin-top: 20px;
`;

const VideoFrame = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
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

const ErrorMessage = styled.div`
  color: red;
  text-align: center;
  padding: 20px;
`;

const AdPreview = ({ adId, onClose }) => {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAd = useCallback(async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const adRef = doc(db, 'ads', adId);
      const adSnap = await getDoc(adRef);
      
      if (adSnap.exists()) {
        setAd(adSnap.data());
      } else {
        setError('広告が見つかりません。');
      }
    } catch (err) {
      setError('広告の取得に失敗しました。');
      console.error('Error fetching ad:', err);
    } finally {
      setLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    fetchAd();
  }, [fetchAd]);

  const handleClose = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (loading) return <PreviewContainer><LoadingSpinner /></PreviewContainer>;
  if (error) return <PreviewContainer><ErrorMessage>{error}</ErrorMessage></PreviewContainer>;
  if (!ad) return null;

  return (
    <PreviewContainer onClick={handleClose}>
      <PreviewContent>
        <CloseButton onClick={onClose} aria-label="閉じる">
          <FaTimes />
        </CloseButton>
        <h2>{ad.title}</h2>
        <p>{ad.description}</p>
        <VideoContainer>
          <VideoFrame
            src={`https://www.youtube.com/embed/${ad.youtubeId}`}
            title={ad.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </VideoContainer>
      </PreviewContent>
    </PreviewContainer>
  );
};

export default React.memo(AdPreview);

// TODO: 広告のインタラクティブ要素の追加（例：クリック可能な領域）
// TODO: 広告効果の即時プレビュー（クリック率予測など）
// TODO: 複数デバイスでのプレビュー機能
// TODO: A/Bテストのためのバリエーション表示
// TODO: パフォーマンス指標のリアルタイム表示
// TODO: ターゲットオーディエンス情報の表示
// TODO: 競合広告との比較機能
// TODO: アクセシビリティチェッカーの統合
// TODO: 広告の共有機能（チーム内レビュー用）
// TODO: コメント/フィードバック機能の追加