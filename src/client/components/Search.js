import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase"; // Firebaseの設定ファイルからインポート

const SearchContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const SearchForm = styled.form`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
`;

const SearchButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    background-color: #cccccc;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const Select = styled.select`
  padding: 5px;
  font-size: 14px;
`;

const ErrorMessage = styled.p`
  color: red;
  margin-bottom: 10px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const VideoCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: auto;
  border-radius: 4px;
`;

const VideoTitle = styled.h3`
  margin: 10px 0;
  font-size: 16px;
`;

const LoadMoreButton = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    background-color: #cccccc;
  }
`;

const SearchHistoryContainer = styled.div`
  margin-top: 20px;
`;

const SearchHistoryItem = styled.button`
  margin-right: 10px;
  margin-bottom: 10px;
  padding: 5px 10px;
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #e0e0e0;
  }
`;

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [sortBy, setSortBy] = useState("relevance");
  const [dateRange, setDateRange] = useState("");
  const [duration, setDuration] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleSearch = async (newSearch = true) => {
    if (!auth.currentUser) {
      setError("You must be logged in to search.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let q = query(collection(db, "videos"), where("title", ">=", query), where("title", "<=", query + '\uf8ff'));

      if (sortBy === "date") {
        q = query(q, orderBy("createdAt", "desc"));
      } else if (sortBy === "viewCount") {
        q = query(q, orderBy("viewCount", "desc"));
      }

      if (dateRange) {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(dateRange));
        q = query(q, where("createdAt", ">=", date));
      }

      if (duration) {
        q = query(q, where("duration", "==", duration));
      }

      q = query(q, limit(10));

      if (!newSearch && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const querySnapshot = await getDocs(q);
      
      const newResults = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (newSearch) {
        setResults(newResults);
      } else {
        setResults([...results, ...newResults]);
      }

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);

      if (newSearch) {
        const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 5);
        setSearchHistory(newHistory);
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
      }
    } catch (err) {
      setError("An error occurred while searching. Please try again.");
      console.error("Error searching videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    handleSearch(false);
  };

  const handleHistoryItemClick = (historyItem) => {
    setQuery(historyItem);
    handleSearch(true);
  };

  return (
    <SearchContainer>
      <h2>Search Videos</h2>
      <SearchForm
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(true);
        }}
      >
        <SearchInput
          type="text"
          id="search-query"
          name="search-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
        />
        <FilterContainer>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
            <option value="viewCount">View Count</option>
          </Select>
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="">Any time</option>
            <option value="7">Last week</option>
            <option value="30">Last month</option>
            <option value="365">Last year</option>
          </Select>
          <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value="">Any duration</option>
            <option value="short">Short (&lt; 4 minutes)</option>
            <option value="medium">Medium (4-20 minutes)</option>
            <option value="long">Long (&gt; 20 minutes)</option>
          </Select>
        </FilterContainer>
        <SearchButton type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </SearchButton>
      </SearchForm>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <VideoGrid>
        {results.map((video) => (
          <VideoCard key={video.id}>
            <VideoThumbnail src={video.thumbnailUrl} alt={video.title} />
            <VideoTitle>{video.title}</VideoTitle>
          </VideoCard>
        ))}
      </VideoGrid>
      {results.length > 0 && (
        <LoadMoreButton onClick={handleLoadMore} disabled={loading}>
          {loading ? "Loading..." : "Load More"}
        </LoadMoreButton>
      )}
      <SearchHistoryContainer>
        <h3>Recent Searches</h3>
        {searchHistory.map((item, index) => (
          <SearchHistoryItem key={index} onClick={() => handleHistoryItemClick(item)}>
            {item}
          </SearchHistoryItem>
        ))}
      </SearchHistoryContainer>
    </SearchContainer>
  );
};

export default Search;