import { useState, useCallback } from "react";
import axios from "axios";
import { useTheme } from './useTheme';

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
  const searchVideos = useCallback(async (query) => {
    if (!query) return [];

    try {
      const response = await axios.get(`/api/search`, {
        params: { q: query }
      });
      
      if (!response.data.items || !Array.isArray(response.data.items)) {
        throw new Error("Invalid API response");
      }
      
      return response.data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
        views: "N/A",
        rating: "N/A",
        uploadDate: new Date(item.snippet.publishedAt).toLocaleDateString(),
      }));
    } catch (error) {
      console.error("Error in useYouTubeSearch:", error);
      throw error;
    }
  }, []);

  return useAsync(searchVideos);
};

export { useTheme };