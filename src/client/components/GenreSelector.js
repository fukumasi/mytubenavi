import React, { useState, useEffect } from "react";
import axios from "axios";
import LargeGenreList from "./LargeGenreList";
import MediumGenreList from "./MediumGenreList";
import SmallGenreList from "./SmallGenreList";

const GenreSelector = () => {
  const [largeGenres, setLargeGenres] = useState([]);
  const [mediumGenres, setMediumGenres] = useState([]);
  const [smallGenres, setSmallGenres] = useState([]);
  const [selectedLargeGenre, setSelectedLargeGenre] = useState(null);
  const [selectedMediumGenre, setSelectedMediumGenre] = useState(null);
  const [selectedSmallGenre, setSelectedSmallGenre] = useState(null);

  useEffect(() => {
    const fetchLargeGenres = async () => {
      try {
        const response = await axios.get("/api/genres/large");
        setLargeGenres(response.data);
      } catch (error) {
        console.error("Error fetching large genres:", error);
      }
    };
    fetchLargeGenres();
  }, []);

  const handleLargeGenreSelect = async (genre) => {
    setSelectedLargeGenre(genre);
    setSelectedMediumGenre(null);
    setSelectedSmallGenre(null);
    try {
      const response = await axios.get(`/api/genres/${genre.slug}/medium`);
      setMediumGenres(response.data);
    } catch (error) {
      console.error("Error fetching medium genres:", error);
    }
  };

  const handleMediumGenreSelect = async (genre) => {
    setSelectedMediumGenre(genre);
    setSelectedSmallGenre(null);
    try {
      const response = await axios.get(`/api/genres/${genre.slug}/small`);
      setSmallGenres(response.data);
    } catch (error) {
      console.error("Error fetching small genres:", error);
    }
  };

  const handleSmallGenreSelect = (genre) => {
    setSelectedSmallGenre(genre);
    // ここで選択された小ジャンルに基づいて何かアクションを起こすことができます
    // 例: ビデオリストの取得など
  };

  return (
    <div>
      <LargeGenreList
        genres={largeGenres}
        onSelect={handleLargeGenreSelect}
        selectedGenre={selectedLargeGenre}
      />
      {selectedLargeGenre && (
        <MediumGenreList
          genres={mediumGenres}
          onSelect={handleMediumGenreSelect}
          selectedGenre={selectedMediumGenre}
        />
      )}
      {selectedMediumGenre && (
        <SmallGenreList
          genres={smallGenres}
          onSelect={handleSmallGenreSelect}
          selectedGenre={selectedSmallGenre}
        />
      )}
    </div>
  );
};

export default GenreSelector;
