import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import styled from "styled-components";
import { searchVideos, getDummyVideos } from "../api/youtube";
import VideoTable from "../components/VideoTable";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import GenreList from "../components/GenreList";
import useSearchHistory from "../hooks/useSearchHistory";
import AdSpace from "../components/AdSpace";
import FilterOptions from "../components/FilterOptions";
import SortOptions from "../components/SortOptions";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { doc, setDoc, arrayUnion, getFirestore, serverTimestamp } from "firebase/firestore";
import ThreeColumnLayout from "../components/ThreeColumnLayout";

const SearchContainer = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px;
`;

const SearchHistoryContainer = styled.div`
  margin-bottom: 20px;
`;

const OptionsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchHistoryItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
`;

const SearchHistoryButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary};
  &:hover {
    text-decoration: underline;
  }
`;

const ClearHistoryButton = styled.button`
  margin-top: 10px;
  padding: 5px 10px;
  background-color: ${({ theme }) => theme.colors.secondary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const VideoTableContainer = styled.div`
  margin-bottom: 20px;
  overflow-x: auto;
`;

const PaginationContainer = styled.div`
  margin-top: 20px;
`;

const ResultSummary = styled.p`
  margin-bottom: 20px;
  font-style: italic;
`;

const VIDEOS_PER_PAGE = 20;

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genre") || "all");
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: searchParams.get("sortKey") || "relevance",
    direction: searchParams.get("sortDirection") || "descending"
  });
  const [additionalSortOptions, setAdditionalSortOptions] = useState({
    highDefinition: searchParams.get("highDefinition") === "true" || false,
    subtitles: searchParams.get("subtitles") === "true" || false,
    creativeCommons: searchParams.get("creativeCommons") === "true" || false,
    liveContent: searchParams.get("liveContent") === "true" || false,
  });
  const [error, setError] = useState(null);

  const { t } = useTranslation();
  const { searchHistory, addToSearchHistory, removeFromSearchHistory, clearSearchHistory } = useSearchHistory();
  const { user } = useAuth();
  const db = getFirestore();

  const searchQueryConfig = useMemo(() => ({
    q: query,
    genre: selectedGenre,
    page: currentPage,
    filters,
    sort: sortConfig,
    ...additionalSortOptions
  }), [query, selectedGenre, currentPage, filters, sortConfig, additionalSortOptions]);

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useQuery(
    ["searchVideos", searchQueryConfig],
    () => searchVideos(searchQueryConfig),
    {
      enabled: !!query || !!selectedGenre,
      retry: 3,
      onError: (error) => setError("Search error: " + error.message),
    }
  );

  const {
    data: dummyVideos,
    isLoading: isDummyLoading,
    error: dummyError,
  } = useQuery("dummyVideos", getDummyVideos, {
    staleTime: Infinity,
    retry: 3,
    onError: (error) => setError("Dummy videos error: " + error.message),
  });

  const updateSearchParams = useCallback((params) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value.toString());
        } else {
          newParams.delete(key);
        }
      });
      return newParams;
    });
  }, [setSearchParams]);

  const handleGenreChange = useCallback(
    (genre) => {
      setSelectedGenre(genre);
      setCurrentPage(1);
      updateSearchParams({ page: "1", genre });
    },
    [updateSearchParams]
  );

  const handlePageChange = useCallback(
    (page) => {
      setCurrentPage(page);
      updateSearchParams({ page: page.toString() });
    },
    [updateSearchParams]
  );

  const handleFilterChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      setCurrentPage(1);
      updateSearchParams({ page: "1", ...newFilters });
    },
    [updateSearchParams]
  );

  const handleSortChange = useCallback(
    (newSortConfig) => {
      setSortConfig(newSortConfig);
      setCurrentPage(1);
      updateSearchParams({ 
        page: "1", 
        sortKey: newSortConfig.key, 
        sortDirection: newSortConfig.direction 
      });
    },
    [updateSearchParams]
  );

  const handleAdditionalSortOptionChange = useCallback(
    (option) => {
      setAdditionalSortOptions(prev => {
        const newOptions = { ...prev, [option]: !prev[option] };
        updateSearchParams(newOptions);
        return newOptions;
      });
    },
    [updateSearchParams]
  );

  const handleSearchHistoryItemClick = useCallback((term) => {
    setSearchParams({ q: term, page: "1" });
  }, [setSearchParams]);

  const handleRemoveSearchHistoryItem = useCallback((term) => {
    removeFromSearchHistory(term);
  }, [removeFromSearchHistory]);

  const handleClearSearchHistory = useCallback(() => {
    clearSearchHistory();
  }, [clearSearchHistory]);

  useEffect(() => {
    if (query && user) {
      addToSearchHistory(query);
      const userRef = doc(db, "users", user.uid);
      setDoc(userRef, {
        searchHistory: arrayUnion({
          query: query,
          timestamp: serverTimestamp()
        })
      }, { merge: true }).catch(error => {
        console.error("Error saving search history:", error);
        setError("検索履歴の保存エラー: " + error.message);
      });
    }
  }, [query, addToSearchHistory, user, db]);

  const { videos, totalVideos, totalPages, paginatedVideos } = useMemo(() => {
    let videosData, total, pages;
    if ((query || selectedGenre !== "all") && searchData) {
      videosData = searchData.videos || [];
      total = searchData.totalVideos || 0;
      pages = searchData.totalPages || 1;
    } else {
      videosData = dummyVideos || [];
      total = videosData.length;
      pages = Math.ceil(total / VIDEOS_PER_PAGE);
    }
    const paginated = videosData.slice(
      (currentPage - 1) * VIDEOS_PER_PAGE,
      currentPage * VIDEOS_PER_PAGE
    ).map(video => ({
      ...video,
      thumbnailUrl: video.thumbnailUrl || video.thumbnail,
      publishedAt: video.publishedAt || null,
    }));
    return { 
      videos: videosData, 
      totalVideos: total, 
      totalPages: pages, 
      paginatedVideos: paginated 
    };
  }, [query, selectedGenre, searchData, dummyVideos, currentPage]);

  if (isSearchLoading || isDummyLoading) return <LoadingSpinner data-testid="loading-spinner" aria-label={t("loading")} />;

  if (searchError || dummyError || error) {
    let errorMessage = t("error.fetch");
    if (searchError) {
      errorMessage += ` ${t("error.search")} ${searchError.message || ''}`;
    }
    if (dummyError) {
      errorMessage += ` ${t("error.dummy")} ${dummyError.message || ''}`;
    }
    if (error) {
      errorMessage += ` ${error}`;
    }
    return <ErrorMessage message={errorMessage} />;
  }

  if (!videos || videos.length === 0) {
    return <ErrorMessage message={t("error.noVideos")} />;
  }

  return (
    <SearchContainer>
      <ThreeColumnLayout>
        <ThreeColumnLayout.LeftColumn>
          <h3>{t("genre")}</h3>
          <GenreList
            onGenreChange={handleGenreChange}
            selectedGenre={selectedGenre}
          />
          <SearchHistoryContainer>
            <h3>{t("searchHistory")}</h3>
            <ul aria-label={t("searchHistoryLabel")}>
              {searchHistory.map((item, index) => (
                <SearchHistoryItem key={index}>
                  <SearchHistoryButton onClick={() => handleSearchHistoryItemClick(item)}>
                    {item}
                  </SearchHistoryButton>
                  <button onClick={() => handleRemoveSearchHistoryItem(item)} aria-label={t("removeFromHistory")}>
                    ✕
                  </button>
                </SearchHistoryItem>
              ))}
            </ul>
            {searchHistory.length > 0 && (
              <ClearHistoryButton onClick={handleClearSearchHistory}>
                {t("clearHistory")}
              </ClearHistoryButton>
            )}
          </SearchHistoryContainer>
        </ThreeColumnLayout.LeftColumn>

        <ThreeColumnLayout.MainColumn>
          <h2>
            {query
              ? t("searchResults", { query })
              : selectedGenre !== "all"
              ? t("genreResults", { genre: selectedGenre })
              : t("recommendedVideos")}
          </h2>
          <ResultSummary aria-live="polite">
            {t("videosFound", { count: totalVideos, currentPage, totalPages })}
          </ResultSummary>
          <OptionsContainer>
            <FilterOptions onFilterChange={handleFilterChange} />
            <SortOptions 
              sortConfig={sortConfig} 
              onSort={handleSortChange}
              additionalOptions={additionalSortOptions}
              onAdditionalOptionChange={handleAdditionalSortOptionChange}
            />
          </OptionsContainer>
          <VideoTableContainer>
            <VideoTable videos={paginatedVideos} />
          </VideoTableContainer>
          {totalPages > 1 && (
            <PaginationContainer>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </PaginationContainer>
          )}
        </ThreeColumnLayout.MainColumn>

        <ThreeColumnLayout.RightColumn>
          <AdSpace />
        </ThreeColumnLayout.RightColumn>
      </ThreeColumnLayout>
    </SearchContainer>
  );
};

export default React.memo(SearchResults);