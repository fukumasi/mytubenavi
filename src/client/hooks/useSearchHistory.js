import { useState, useEffect, useCallback } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAuth } from './useAuth';
import { doc, getDoc, setDoc, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';

const MAX_HISTORY_LENGTH = 10;
const COLLECTION_NAME = 'searchHistories';

const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const { db } = useFirebase();
  const { user } = useAuth();

  useEffect(() => {
    const loadSearchHistory = async () => {
      if (user) {
        try {
          const docRef = doc(db, COLLECTION_NAME, user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSearchHistory(docSnap.data().history || []);
          } else {
            await setDoc(docRef, { history: [] });
          }
        } catch (error) {
          console.error('Failed to load search history:', error);
        }
      } else {
        setSearchHistory([]);
      }
    };

    loadSearchHistory();
  }, [db, user]);

  const saveSearchHistory = useCallback(async (history) => {
    if (user) {
      try {
        const docRef = doc(db, COLLECTION_NAME, user.uid);
        await updateDoc(docRef, { history });
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }
  }, [db, user]);

  const addToSearchHistory = useCallback(async (term) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;

    setSearchHistory((prevHistory) => {
      const updatedHistory = [
        trimmedTerm,
        ...prevHistory.filter((item) => item.toLowerCase() !== trimmedTerm.toLowerCase()),
      ].slice(0, MAX_HISTORY_LENGTH);

      saveSearchHistory(updatedHistory);
      return updatedHistory;
    });

    if (user) {
      const docRef = doc(db, COLLECTION_NAME, user.uid);
      await updateDoc(docRef, {
        history: arrayUnion(trimmedTerm)
      });
    }
  }, [saveSearchHistory, db, user]);

  const removeFromSearchHistory = useCallback(async (term) => {
    setSearchHistory((prevHistory) => {
      const updatedHistory = prevHistory.filter((item) => item !== term);
      saveSearchHistory(updatedHistory);
      return updatedHistory;
    });

    if (user) {
      const docRef = doc(db, COLLECTION_NAME, user.uid);
      await updateDoc(docRef, {
        history: arrayRemove(term)
      });
    }
  }, [saveSearchHistory, db, user]);

  const clearSearchHistory = useCallback(async () => {
    setSearchHistory([]);
    if (user) {
      const docRef = doc(db, COLLECTION_NAME, user.uid);
      await setDoc(docRef, { history: [] });
    }
  }, [db, user]);

  const getSearchSuggestions = useCallback((term) => {
    const trimmedTerm = term.trim().toLowerCase();
    if (!trimmedTerm) return [];

    // 履歴からの提案
    const historySuggestions = searchHistory.filter(item => 
      item.toLowerCase().includes(trimmedTerm)
    );

    // 関連検索キーワードの提案 (ダミーデータ)
    const relatedSuggestions = [
      `${trimmedTerm} 関連動画`,
      `${trimmedTerm} 人気`,
      `${trimmedTerm} 最新`,
      `${trimmedTerm} チュートリアル`,
    ];

    // 重複を除去し、履歴の提案を優先
    const combinedSuggestions = [
      ...new Set([...historySuggestions, ...relatedSuggestions])
    ].slice(0, 10); // 最大10件に制限

    return combinedSuggestions;
  }, [searchHistory]);

  const getPopularSearches = useCallback(() => {
    // 最近の検索履歴から上位5件を取得
    return searchHistory.slice(0, 5);
  }, [searchHistory]);

  return { 
    searchHistory, 
    addToSearchHistory, 
    removeFromSearchHistory, 
    clearSearchHistory,
    getSearchSuggestions,
    getPopularSearches
  };
};

export default useSearchHistory;