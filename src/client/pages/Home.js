import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import VideoList from '../components/VideoList';
import PopularVideos from '../components/PopularVideos';
import FeaturedVideos from '../components/FeaturedVideos';
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import AdSpace from '../components/AdSpace';
import { FaFilm, FaMusic, FaGamepad, FaFootballBall, FaNewspaper, FaGraduationCap, FaFlask, FaUtensils, FaPlane, FaTshirt, FaSprayCan, FaPaw, FaHammer, FaPalette, FaBriefcase, FaMicrochip, FaCar } from 'react-icons/fa';
import { getTopLevelGenres } from '../api/genreApi';
import { useFirebase } from '../contexts/FirebaseContext';

const HomeContainer = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  text-align: center;
`;

const LoadingMessage = styled.p`
  text-align: center;
`;

const GenreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 30px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GenreButton = styled.button`
  background-color: ${props => props.color || props.theme.colors.primary};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 50px;
  width: 100%;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 8px ${({ theme }) => theme.colors.shadow};
  }

  svg {
    margin-right: 10px;
  }
`;

const iconMap = {
  'エンターテイメント': FaFilm,
  '音楽': FaMusic,
  'ゲーム': FaGamepad,
  'スポーツ': FaFootballBall,
  'ニュース': FaNewspaper,
  '教育': FaGraduationCap,
  'テクノロジー': FaMicrochip,
  'フード': FaUtensils,
  'ビューティ': FaSprayCan,
  '車': FaCar,
  '情報・知識': FaFlask,
  'ライフスタイル': FaPlane,
  'クリエイティブ': FaPalette,
  'ビジネス': FaBriefcase,
  'ライフハック': FaHammer,
  'キッズ': FaPaw,
  'コミュニティ': FaTshirt,
};

const colorMap = {
  'エンターテイメント': '#4285F4',
  '音楽': '#34A853',
  'ゲーム': '#FBBC05',
  'スポーツ': '#EA4335',
  'ニュース': '#4285F4',
  '教育': '#34A853',
  'テクノロジー': '#FBBC05',
  'フード': '#EA4335',
  'ビューティ': '#4285F4',
  '車': '#34A853',
  '情報・知識': '#FBBC05',
  'ライフスタイル': '#EA4335',
  'クリエイティブ': '#4285F4',
  'ビジネス': '#34A853',
  'ライフハック': '#FBBC05',
  'キッズ': '#EA4335',
  'コミュニティ': '#4285F4',
};

const Home = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [genres, setGenres] = useState([]);
  const { db } = useFirebase();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setIsLoading(true);
        const topLevelGenres = await getTopLevelGenres(db);
        const genresWithIcons = topLevelGenres.map(genre => ({
          ...genre,
          icon: iconMap[genre.name] || FaFilm,
          color: colorMap[genre.name] || '#4285F4'
        }));
        setGenres(genresWithIcons);
      } catch (err) {
        console.error("Error fetching genres:", err);
        setError(t("errorFetchingGenres"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, [db, t]);

  const handleGenreClick = useCallback((genreId, genreName) => {
    console.log("Clicked genre:", genreId, genreName);
    navigate(`/genre/0/${genreId}`);
  }, [navigate]);

  const renderMainContent = () => {
    if (isLoading) {
      return <LoadingMessage>{t('loading.message')}</LoadingMessage>;
    }
    if (error) {
      return <ErrorMessage>{error}</ErrorMessage>;
    }
    return (
      <>
        <GenreGrid>
          {genres.map((genre) => (
            <GenreButton
              key={genre.id}
              color={genre.color}
              onClick={() => handleGenreClick(genre.id, genre.name)}
            >
              {React.createElement(genre.icon, { size: 20 })}
              {genre.name}
            </GenreButton>
          ))}
        </GenreGrid>
        <PopularVideos />
        <FeaturedVideos />
      </>
    );
  };

  return (
    <HomeContainer>
      <Title>{t('welcome')}</Title>
      <ThreeColumnLayout
        leftColumn={<AdSpace />}
        mainColumn={renderMainContent()}
        rightColumn={<AdSpace />}
      />
    </HomeContainer>
  );
};

export default Home;