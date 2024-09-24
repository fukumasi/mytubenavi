// src\client\components\GenreSelector.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
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
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const fetchLargeGenres = async () => {
      try {
        const genresCollection = collection(db, "genres");
        const largeGenresQuery = query(genresCollection, where("type", "==", "large"));
        const querySnapshot = await getDocs(largeGenresQuery);
        const fetchedGenres = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLargeGenres(fetchedGenres);
      } catch (error) {
        console.error("Error fetching large genres:", error);
      }
    };
    fetchLargeGenres();
  }, [db]);

  const handleLargeGenreSelect = async (genre) => {
    setSelectedLargeGenre(genre);
    setSelectedMediumGenre(null);
    setSelectedSmallGenre(null);
    try {
      const genresCollection = collection(db, "genres");
      const mediumGenresQuery = query(genresCollection, where("parentId", "==", genre.id), where("type", "==", "medium"));
      const querySnapshot = await getDocs(mediumGenresQuery);
      const fetchedGenres = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMediumGenres(fetchedGenres);
    } catch (error) {
      console.error("Error fetching medium genres:", error);
    }
    performSearch(genre.slug);
  };

  const handleMediumGenreSelect = async (genre) => {
    setSelectedMediumGenre(genre);
    setSelectedSmallGenre(null);
    try {
      const genresCollection = collection(db, "genres");
      const smallGenresQuery = query(genresCollection, where("parentId", "==", genre.id), where("type", "==", "small"));
      const querySnapshot = await getDocs(smallGenresQuery);
      const fetchedGenres = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSmallGenres(fetchedGenres);
    } catch (error) {
      console.error("Error fetching small genres:", error);
    }
    performSearch(genre.slug);
  };

  const handleSmallGenreSelect = (genre) => {
    setSelectedSmallGenre(genre);
    performSearch(genre.slug);
  };

  const performSearch = (genreSlug) => {
    navigate(`/search?genre=${genreSlug}`);
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