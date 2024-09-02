import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import styled from "styled-components";
import { searchVideos, getDummyVideos } from "../api/youtube";
import VideoTable from "../components/VideoTable";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import AdSpace from "../components/AdSpace";
import FeaturedVideos from "../components/FeaturedVideos";
import GenreList from "../components/GenreList";
import FilterOptions from "../components/FilterOptions";
import SortOptions from "../components/SortOptions";

const SearchContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 4fr 200px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 3fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div`
  grid-column: 1;

  @media (max-width: 768px) {
    grid-column: auto;
  }
`;

const MainContent = styled.div`
  grid-column: 2;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    grid-column: auto;
  }
`;

const VideoTableContainer = styled.div`
  margin-bottom: 20px;
  overflow-x: auto;
`;

const PaginationContainer = styled.div`
  margin-top: 20px;
`;

const RightColumn = styled.div`
  grid-column: 3;
  width: 200px;

  @media (max-width: 1024px) {
    grid-column: 1 / -1;
    width: 100%;
  }
`;

const FilterSortContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
  }
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
  const [sortConfig, setSortConfig] = useState({
    key: searchParams.get("sort") || "relevance",
    direction: searchParams.get("order") || "descending",
  });
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "any");
  const [durationFilter, setDurationFilter] = useState(searchParams.get("duration") || "any");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "");

  const searchQueryConfig = useMemo(() => ({
    q: query,
    genre: selectedGenre,
    page: currentPage,
    sort: `${sortConfig.key},${sortConfig.direction}`,
    date: dateFilter,
    duration: durationFilter,
    category: categoryFilter,
  }), [query, selectedGenre, currentPage, sortConfig, dateFilter, durationFilter, categoryFilter]);

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useQuery(
    ["searchVideos", searchQueryConfig],
    () => searchVideos(searchQueryConfig),
    {
      enabled: !!query,
      retry: 3,
      onError: (error) => console.error("Search error:", error),
    }
  );

  const {
    data: dummyVideos,
    isLoading: isDummyLoading,
    error: dummyError,
  } = useQuery("dummyVideos", getDummyVideos, {
    staleTime: Infinity,
    retry: 3,
    onError: (error) => console.error("Dummy videos error:", error),
  });

  const updateSearchParams = useCallback((params) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
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

  const handleSort = useCallback((key) => {
    setSortConfig((prevConfig) => {
      const newConfig = {
        key,
        direction:
          prevConfig.key === key && prevConfig.direction === "ascending"
            ? "descending"
            : "ascending",
      };
      updateSearchParams({ sort: newConfig.key, order: newConfig.direction });
      return newConfig;
    });
  }, [updateSearchParams]);

  const handlePageChange = useCallback(
    (page) => {
      setCurrentPage(page);
      updateSearchParams({ page: page.toString() });
    },
    [updateSearchParams]
  );

  const handleFilterChange = useCallback((filterType, value) => {
    switch (filterType) {
      case 'date':
        setDateFilter(value);
        break;
      case 'duration':
        setDurationFilter(value);
        break;
      case 'category':
        setCategoryFilter(value);
        break;
      default:
        console.warn(`Unknown filter type: ${filterType}`);
        return;
    }
    setCurrentPage(1);
    updateSearchParams({ [filterType]: value, page: "1" });
  }, [updateSearchParams]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Search Data:", searchData);
      console.log("Dummy Videos:", dummyVideos);
      console.log("Query:", query);
      console.log("Is Loading:", isSearchLoading, isDummyLoading);
      if (searchError) console.error("Search Error:", searchError);
      if (dummyError) console.error("Dummy Videos Error:", dummyError);
    }
  }, [
    searchData,
    dummyVideos,
    query,
    isSearchLoading,
    isDummyLoading,
    searchError,
    dummyError,
  ]);

  const { videos, totalVideos, totalPages, paginatedVideos } = useMemo(() => {
    let videosData, total, pages;
    if (query && searchData) {
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
    );
    return { 
      videos: videosData, 
      totalVideos: total, 
      totalPages: pages, 
      paginatedVideos: paginated 
    };
  }, [query, searchData, dummyVideos, currentPage]);

  if (isSearchLoading || isDummyLoading) return <LoadingSpinner data-testid="loading-spinner" />;

  if (searchError || dummyError) {
    let errorMessage = "データの取得中にエラーが発生しました。";
    if (searchError instanceof Error) {
      errorMessage += ` 検索エラー: ${searchError.message}`;
    }
    if (dummyError instanceof Error) {
      errorMessage += ` ダミーデータエラー: ${dummyError.message}`;
    }
    return <ErrorMessage message={errorMessage} />;
  }

  if (!videos || videos.length === 0) {
    return <ErrorMessage message="動画が見つかりませんでした。検索条件を変更してお試しください。" />;
  }

  return (
    <SearchContainer>
      <LeftColumn>
        <h3>ジャンル</h3>
        <GenreList
          onGenreChange={handleGenreChange}
          selectedGenre={selectedGenre}
        />
      </LeftColumn>

      <MainContent>
        <h2>{query ? `「${query}」の検索結果` : "おすすめ動画"}</h2>
        <ResultSummary>
          {totalVideos}件の動画が見つかりました（{currentPage} / {totalPages}ページ）
        </ResultSummary>
        <FilterSortContainer>
          <FilterOptions
            dateFilter={dateFilter}
            durationFilter={durationFilter}
            categoryFilter={categoryFilter}
            onFilterChange={handleFilterChange}
          />
          <SortOptions
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </FilterSortContainer>
        <VideoTableContainer>
          <VideoTable
            videos={paginatedVideos}
            onSort={handleSort}
            sortConfig={sortConfig}
          />
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
      </MainContent>

      <RightColumn>
        <h3>有料掲載動画</h3>
        <FeaturedVideos />
        <AdSpace text="右カラム広告1" />
        <AdSpace text="右カラム広告2" />
        <AdSpace text="右カラム広告3" />
      </RightColumn>
    </SearchContainer>
  );
};

export default React.memo(SearchResults);