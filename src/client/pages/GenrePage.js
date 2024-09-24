import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { useFirebase } from "../contexts/FirebaseContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import VideoCard from "../components/VideoCard"; // このコンポーネントは別途作成する必要があります

const GenreContainer = styled.div`
  padding: 20px;
`;

const GenreTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`;

const GenrePage = () => {
  const { genreSlug } = useParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { db } = useFirebase();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const videosRef = collection(db, "videos");
        const q = query(videosRef, where("genre", "==", genreSlug));
        const querySnapshot = await getDocs(q);
        
        const fetchedVideos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setVideos(fetchedVideos);
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("動画の取得中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [db, genreSlug]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <GenreContainer>
      <GenreTitle>{genreSlug} Videos</GenreTitle>
      <VideoGrid>
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </VideoGrid>
    </GenreContainer>
  );
};

export default GenrePage;