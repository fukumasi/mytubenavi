import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { getTopLevelGenres, getSubGenres } from '../api/genreApi';

const GenreListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.small};
  margin-bottom: ${({ theme }) => theme.spacing.large};
  width: 100%;
  max-width: ${({ theme }) => theme.layout.sideColumnWidth};
`;

const GenreItem = styled.div`
  background-color: ${({ theme, $isActive }) => 
    $isActive ? theme.colors.primaryDark : theme.colors.primary
  };
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.xsmall} ${({ theme }) => theme.spacing.small};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: ${({ theme }) => theme.fontSizes.small};
  transition: background-color ${({ theme }) => theme.transitions.fast};
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const LoadingMessage = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.medium};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.fontSizes.medium};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.medium};
`;

const GenreList = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { db } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const { genreId } = useParams();
  const activeGenreId = genreId || location.pathname.split('/').pop();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoading(true);
        let fetchedGenres;
        if (genreId) {
          fetchedGenres = await getSubGenres(db, genreId);
        } else {
          fetchedGenres = await getTopLevelGenres(db);
        }
        setGenres(fetchedGenres);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching genres:", err);
        setError('ジャンルの読み込みに失敗しました');
        setLoading(false);
      }
    };

    fetchGenres();
  }, [db, genreId]);

  const handleGenreClick = useCallback((clickedGenreId) => {
    const clickedGenre = genres.find(genre => genre.id === clickedGenreId);
    if (clickedGenre) {
      navigate(`/genre/${clickedGenre.level}/${clickedGenreId}`);
    }
  }, [genres, navigate]);

  if (loading) return <LoadingMessage>ジャンルを読み込んでいます...</LoadingMessage>;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;

  return (
    <GenreListContainer>
      {genres && genres.length > 0 ? (
        genres.map(genre => (
          <GenreItem 
            key={genre.id}
            onClick={() => handleGenreClick(genre.id)}
            $isActive={genre.id === activeGenreId}
          >
            {genre.name}
          </GenreItem>
        ))
      ) : (
        <ErrorMessage>ジャンルがありません</ErrorMessage>
      )}
    </GenreListContainer>
  );
};

export default GenreList;