// src\client\components\AdVideoDisplay.js
import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { getFirestore, doc, getDoc, updateDoc, increment } from "firebase/firestore";

// Styled components remain unchanged...

const AdVideoDisplay = ({ adId }) => {
  const [adVideo, setAdVideo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdVideo = useCallback(async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const adRef = doc(db, "adVideos", adId);
      const adDoc = await getDoc(adRef);

      if (adDoc.exists()) {
        setAdVideo(adDoc.data());
        // 表示回数をインクリメント
        await updateDoc(adRef, {
          viewCount: increment(1)
        });
      } else {
        setError("広告ビデオが見つかりません");
      }
    } catch (error) {
      console.error("Error fetching ad video:", error);
      setError(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    if (adId) {
      fetchAdVideo();
    }
  }, [adId, fetchAdVideo]);

  const handleAdClick = useCallback(async () => {
    try {
      const db = getFirestore();
      const adRef = doc(db, "adVideos", adId);
      await updateDoc(adRef, {
        clickCount: increment(1)
      });
      // 広告のリンク先に遷移する処理をここに追加
      if (adVideo && adVideo.youtubeId) {
        window.open(`https://www.youtube.com/watch?v=${adVideo.youtubeId}`, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error("Error incrementing click count:", error);
    }
  }, [adId, adVideo]);

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

export default React.memo(AdVideoDisplay);
