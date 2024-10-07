import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useFirebase } from "../contexts/FirebaseContext";
import { getGenreById, getSubGenres } from "../api/genreApi";
import { getVideosByGenre } from "../api/youtube";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { useTranslation } from "react-i18next";
import ThreeColumnLayout from '../components/ThreeColumnLayout';
import GenreList from '../components/GenreList';

const GenreContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const GenreTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.text};
`;

const VideoTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
`;

const TableHeader = styled.th`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: 10px;
  text-align: left;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
  }
`;

const TableCell = styled.td`
  padding: 10px;
`;

const VideoThumbnail = styled.img`
  width: 120px;
  height: 90px;
  object-fit: cover;
  cursor: pointer;
`;

const BreadcrumbContainer = styled.div`
  margin-bottom: 20px;
  font-size: 14px;
`;

const BreadcrumbLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const GenrePage = () => {
  const { level, genreId } = useParams();
  const [genre, setGenre] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { db } = useFirebase();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const VIDEOS_PER_PAGE = 20;

  const fetchGenreData = useCallback(async () => {
    try {
      setLoading(true);
      if (genreId) {
        const genreData = await getGenreById(db, genreId);
        setGenre(genreData);
      }
    } catch (err) {
      console.error("Error fetching genre data:", err);
      setError(t("errorFetchingGenreData"));
    } finally {
      setLoading(false);
    }
  }, [db, genreId, t]);

  const fetchVideos = useCallback(async () => {
    if (genreId) {
      try {
        setLoading(true);
        const fetchedVideos = await getVideosByGenre(genreId, VIDEOS_PER_PAGE);
        setVideos(fetchedVideos);
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError(t("errorFetchingVideos"));
      } finally {
        setLoading(false);
      }
    }
  }, [genreId, t]);

  useEffect(() => {
    fetchGenreData();
    fetchVideos();
  }, [fetchGenreData, fetchVideos]);

  const handleVideoClick = useCallback((videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const content = (
    <GenreContainer>
      {genre && (
        <>
          <BreadcrumbContainer>
            <BreadcrumbLink to="/genres">{t("allGenres")}</BreadcrumbLink> &gt; 
            {genre.parentId && <><BreadcrumbLink to={`/genre/${parseInt(level) - 1}/${genre.parentId}`}>{t("parentGenre")}</BreadcrumbLink> &gt; </>}
            {genre.name}
          </BreadcrumbContainer>
          <GenreTitle>{genre.name}</GenreTitle>
          {videos.length > 0 ? (
            <>
              <h2>{t("videos")}</h2>
              <VideoTable>
                <thead>
                  <tr>
                    <TableHeader>{t("thumbnail")}</TableHeader>
                    <TableHeader>{t("title")}</TableHeader>
                    <TableHeader>{t("channel")}</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {videos.map(video => (
                    <TableRow key={video.id.videoId}>
                      <TableCell>
                        <VideoThumbnail
                          src={video.snippet.thumbnails.default.url}
                          alt={video.snippet.title}
                          onClick={() => handleVideoClick(video.id.videoId)}
                        />
                      </TableCell>
                      <TableCell>{video.snippet.title}</TableCell>
                      <TableCell>{video.snippet.channelTitle}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </VideoTable>
            </>
          ) : (
            <p>{t("noVideosFound")}</p>
          )}
        </>
      )}
    </GenreContainer>
  );

  return (
    <ThreeColumnLayout>
      <ThreeColumnLayout.LeftColumn>
        <GenreList />
      </ThreeColumnLayout.LeftColumn>
      <ThreeColumnLayout.MainColumn>
        {content}
      </ThreeColumnLayout.MainColumn>
      <ThreeColumnLayout.RightColumn>
        {/* ここに右カラムのコンテンツを追加 */}
      </ThreeColumnLayout.RightColumn>
    </ThreeColumnLayout>
  );
};

export default GenrePage;