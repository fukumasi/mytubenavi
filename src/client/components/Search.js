import React, { useState } from 'react';
import axios from 'axios';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const handleSearch = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/videos/search?query=${query}&page=${page}&limit=10`);
      setResults(response.data.videos);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
      console.error('Error searching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    handleSearch(newPage);
  };

  return (
    <div>
      <h2>Search Videos</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
      <input
  type="text"
  id="search-query"  // この行を追加
  name="search-query"  // この行を追加
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Enter search query"
/>
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        {results.map((video) => (
          <div key={video._id}>
            <h3>{video.title}</h3>
            <img src={video.thumbnailUrl} alt={video.title} />
            <p>{video.description}</p>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              disabled={page === currentPage}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;