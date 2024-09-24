// src\client\components\AdSpace.js
import React, { useState, useEffect } from "react";
import AdVideoDisplay from "./AdVideoDisplay";
import styled from "styled-components";
import { getFirestore, collection, query, where, limit, getDocs } from "firebase/firestore";

// スタイル定義
const AdContainer = styled.div`
  background-color: #f0f0f0;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const ErrorMessage = styled.div`
  color: #ff0000;
  font-weight: bold;
  padding: 10px;
`;

/**
 * AdSpace コンポーネント
 * 
 * このコンポーネントは、アクティブな広告を取得し、
 * AdVideoDisplay コンポーネントを使用して表示します。
 */
const AdSpace = () => {
  // アクティブな広告のIDを保持するstate
  const [activeAdId, setActiveAdId] = useState(null);
  
  // エラーメッセージを保持するstate
  const [error, setError] = useState(null);

  // コンポーネントのマウント時にアクティブな広告を取得
  useEffect(() => {
    const fetchActiveAd = async () => {
      try {
        const db = getFirestore();
        const adsRef = collection(db, "ads");
        const q = query(adsRef, where("active", "==", true), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const activeAd = querySnapshot.docs[0];
          setActiveAdId(activeAd.id);
        } else {
          // アクティブな広告が見つからない場合はエラーを設定
          setError("No active ad videos available");
        }
      } catch (error) {
        // Firestoreリクエスト中にエラーが発生した場合の処理
        console.error("Error fetching active ad video:", error);
        setError(`広告の取得中にエラーが発生しました: ${error.message}`);
      }
    };

    // アクティブな広告を取得する関数を呼び出し
    fetchActiveAd();
  }, []); // 空の依存配列を指定して、マウント時にのみ実行

  // エラーがある場合はエラーメッセージを表示
  if (error) {
    return (
      <AdContainer>
        <ErrorMessage>広告を読み込めませんでした: {error}</ErrorMessage>
      </AdContainer>
    );
  }

  // アクティブな広告IDがない場合は何も表示しない
  if (!activeAdId) return null;

  // アクティブな広告IDがある場合はAdVideoDisplayコンポーネントを表示
  return (
    <AdContainer>
      <AdVideoDisplay adId={activeAdId} />
    </AdContainer>
  );
};

// AdSpaceコンポーネントをエクスポート
export default AdSpace;


