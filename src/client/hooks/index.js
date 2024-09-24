import { useState, useCallback } from "react";
import { useTheme } from './useTheme';
import { useFirebase } from '../contexts/FirebaseContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const useAsync = (asyncFunction) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(
    async (...params) => {
      try {
        setLoading(true);
        setError(null);
        const result = await asyncFunction(...params);
        setData(result);
        return result;
      } catch (error) {
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction],
  );

  return { execute, loading, error, data };
};

export const useError = () => {
  const [error, setError] = useState(null);

  const showError = useCallback((message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, showError, clearError };
};

export const useYouTubeSearch = () => {
  const { app } = useFirebase();
  const functions = getFunctions(app);

  const searchVideos = useCallback(async (query) => {
    if (!query) return [];

    try {
      const searchYouTubeVideos = httpsCallable(functions, 'searchYouTubeVideos');
      const result = await searchYouTubeVideos({ query });
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid API response");
      }
      
      return result.data.map((item) => ({
        id: item.id,
        title: item.title,
        channel: item.channel,
        thumbnail: item.thumbnail,
        views: item.views || "N/A",
        rating: item.rating || "N/A",
        uploadDate: item.uploadDate,
      }));
    } catch (error) {
      console.error("Error in useYouTubeSearch:", error);
      throw error;
    }
  }, [functions]);

  return useAsync(searchVideos);
};

export { useTheme };