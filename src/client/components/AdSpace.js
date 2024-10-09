import React, { useState, useEffect } from "react";
import AdVideoDisplay from "./AdVideoDisplay";
import styled from "styled-components";
import { getFirestore, collection, query, where, limit, getDocs } from "firebase/firestore";

const AdContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundLight};
  padding: ${({ theme }) => theme.spacing.medium};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  text-align: center;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  box-shadow: 0 2px 4px ${({ theme }) => theme.colors.shadow};
  width: 100%;
  max-width: ${({ theme }) => theme.layout.sideColumnWidth};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-weight: bold;
  padding: ${({ theme }) => theme.spacing.medium};
`;

const AdSpace = () => {
  const [activeAdId, setActiveAdId] = useState(null);
  const [error, setError] = useState(null);

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
          setError("No active ad videos available");
        }
      } catch (error) {
        console.error("Error fetching active ad video:", error);
        setError(`広告の取得中にエラーが発生しました: ${error.message}`);
      }
    };

    fetchActiveAd();
  }, []);

  if (error) {
    return (
      <AdContainer>
        <ErrorMessage>{error}</ErrorMessage>
      </AdContainer>
    );
  }

  if (!activeAdId) return null;

  return (
    <AdContainer>
      <AdVideoDisplay adId={activeAdId} />
    </AdContainer>
  );
};

export default AdSpace;