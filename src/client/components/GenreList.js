import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, getDocs } from 'firebase/firestore';

const GenreListContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
`;

const GenreItem = styled(Link)`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const GenreList = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { db } = useFirebase();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genresCollection = collection(db, 'genres');
        const genresSnapshot = await getDocs(genresCollection);
        const genresList = genresSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGenres(genresList);
        setLoading(false);
      } catch (err) {
        setError('ジャンルの読み込みに失敗しました');
        setLoading(false);
      }
    };

    fetchGenres();
  }, [db]);

  if (loading) return <div>ジャンルを読み込んでいます...</div>;
  if (error) return <div>{error}</div>;

  return (
    <GenreListContainer>
      {genres && genres.length > 0 ? (
        genres.map(genre => (
          <GenreItem key={genre.id} to={`/genre/${genre.id}`}>
            {genre.name}
          </GenreItem>
        ))
      ) : (
        <div>ジャンルがありません</div>
      )}
    </GenreListContainer>
  );
};

export default GenreList;