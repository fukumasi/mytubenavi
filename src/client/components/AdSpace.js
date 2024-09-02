import React, { useState, useEffect } from "react";
import axios from "axios";
import AdVideoDisplay from "./AdVideoDisplay";
import styled from "styled-components";

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
        // アクティブな広告を取得するAPIを呼び出し
        const response = await axios.get("/api/ad-videos/active");
        
        // レスポンスからアクティブな広告のIDを取得
        if (response.data && response.data.data && response.data.data.activeAdVideo) {
          setActiveAdId(response.data.data.activeAdVideo._id);
        } else {
          // アクティブな広告が見つからない場合はエラーを設定
          setError("No active ad videos available");
        }
      } catch (error) {
        // APIリクエスト中にエラーが発生した場合の処理
        console.error("Error fetching active ad video:", error.response || error);
        setError(error.response 
          ? `Error: ${error.response.status} ${error.response.statusText}` 
          : error.message
        );
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

// 以下、将来の拡張のためのプレースホルダー
// TODO: 広告のパフォーマンス分析機能を追加
// TODO: 複数の広告をローテーションで表示する機能を実装
// TODO: ユーザーの興味に基づいてパーソナライズされた広告を表示する機能を追加

// プレースホルダーの行
// ...
// ...
// ...
// ...
// ...