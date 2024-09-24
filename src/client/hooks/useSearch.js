import { useState, useCallback, useEffect } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAuth } from './useAuth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  arrayUnion, 
  arrayRemove, 
  updateDoc 
} from 'firebase/firestore';

const MAX_HISTORY_ITEMS = 10;

const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const { db } = useFirebase();
  const { user } = useAuth();

  useEffect(() => {
    const fetchSearchHistory = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().searchHistory) {
          setSearchHistory(userDoc.data().searchHistory);
        }
      } else {
        setSearchHistory([]);
      }
    };

    fetchSearchHistory();
  }, [user, db]);

  const addToSearchHistory = useCallback(async (term) => {
    if (!term.trim() || !user) return;
    const newTerm = term.trim();
    const updatedHistory = [newTerm, ...searchHistory.filter(item => item.toLowerCase() !== newTerm.toLowerCase())].slice(0, MAX_HISTORY_ITEMS);
    setSearchHistory(updatedHistory);

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      searchHistory: updatedHistory
    });
  }, [searchHistory, user, db]);

  const removeFromSearchHistory = useCallback(async (term) => {
    if (!user) return;
    const updatedHistory = searchHistory.filter(item => item.toLowerCase() !== term.toLowerCase());
    setSearchHistory(updatedHistory);

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      searchHistory: updatedHistory
    });
  }, [searchHistory, user, db]);

  const clearSearchHistory = useCallback(async () => {
    if (!user) return;
    setSearchHistory([]);

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      searchHistory: []
    });
  }, [user, db]);

  const getSearchSuggestions = useCallback((prefix) => {
    return searchHistory.filter(item => 
      item.toLowerCase().startsWith(prefix.toLowerCase())
    ).slice(0, 5);
  }, [searchHistory]);

  return {
    searchHistory,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    getSearchSuggestions,
  };
};

export default useSearchHistory;
export { useSearchHistory };