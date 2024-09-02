import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";

const AdContainer = styled.div`
  background-color: #f0f0f0;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; // 16:9 アスペクト比
  height: 0;
  overflow: hidden;
`;

const VideoFrame = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
`;

const AdTitle = styled.h3`
  margin-bottom: 10px;
  color: #333;
`;

const AdDescription = styled.p`
  margin-bottom: 15px;
  color: #666;
  font-size: 0.9em;
`;

const AdLabel = styled.span`
  background-color: #ffd700;
  color: #333;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.8em;
  margin-bottom: 10px;
  display: inline-block;
`;

const AdStats = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
  font-size: 0.8em;
  color: #666;
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
  color: #ff0000;
  margin: 20px 0;
  font-weight: bold;
`;

const AdVideoDisplay = ({ adId }) => {
  const [adVideo, setAdVideo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdVideo = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/ad-videos/${adId}`);
        if (response.data && response.data.data && response.data.data.adVideo) {
          setAdVideo(response.data.data.adVideo);
          // 表示回数をインクリメント
          await axios.post(`/api/ad-videos/${adId}/view`);
        } else {
          setError("広告ビデオが見つかりません");
        }
      } catch (error) {
        console.error("Error fetching ad video:", error.response || error);
        setError(error.response ? `エラー: ${error.response.status} ${error.response.statusText}` : error.message);
      } finally {
        setLoading(false);
      }
    };

    if (adId) {
      fetchAdVideo();
    }
  }, [adId]);

  const handleAdClick = async () => {
    try {
      await axios.post(`/api/ad-videos/${adId}/click`);
      // 広告のリンク先に遷移する処理をここに追加
      window.open(`https://www.youtube.com/watch?v=${adVideo.youtubeId}`, '_blank');
    } catch (error) {
      console.error("Error incrementing click count:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner aria-label="広告を読み込み中" />;
  }

  if (error) {
    return <ErrorMessage>広告を読み込めませんでした: {error}</ErrorMessage>;
  }

  if (!adVideo) return null;

  return (
    <AdContainer onClick={handleAdClick}>
      <AdLabel>広告</AdLabel>
      <AdTitle>{adVideo.title}</AdTitle>
      <AdDescription>{adVideo.description}</AdDescription>
      <VideoContainer>
        <VideoFrame
          src={`https://www.youtube.com/embed/${adVideo.youtubeId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={adVideo.title}
        />
      </VideoContainer>
      <AdStats>
        <span>表示回数: {adVideo.viewCount}</span>
        <span>クリック数: {adVideo.clickCount}</span>
      </AdStats>
    </AdContainer>
  );
};

export default AdVideoDisplay;

// TODO: 広告の効果測定機能の追加（CTR、視聴時間など）
// TODO: 関連広告の表示機能
// TODO: ユーザーの興味に基づいたパーソナライズ広告
// TODO: 広告のスキップ機能の実装
// TODO: 広告の音声のオン/オフ切り替え
// TODO: 多言語対応（字幕機能）
// TODO: 広告の評価機能（ユーザーフィードバック）
// TODO: A/Bテスト機能（異なる広告フォーマットの効果測定）
// TODO: 広告のプリロード機能（パフォーマンス向上）
// TODO: レスポンシブデザインの最適化
// TODO: 広告ブロッカー検出と対応策
// TODO: プログレッシブエンハンスメント（低帯域幅環境への対応）
// TODO: アクセシビリティのさらなる向上（スクリーンリーダー対応など）