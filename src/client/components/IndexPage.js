// src\client\components\IndexPage.js
console.log("IndexPage.js is being imported");
console.log("IndexPage rendering");
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import AdSpace from "./AdSpace";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #e0e0e0;
`;

const MainContent = styled.div`
  display: flex;
  margin-top: 20px;
`;

const Sidebar = styled.aside`
  width: 20%;
  padding: 0 15px;
`;

const CenterContent = styled.main`
  width: 60%;
  padding: 0 15px;
`;

const GenreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-top: 20px;
`;

const GenreItem = styled(Link)`
  background-color: #e0e0e0;
  padding: 10px;
  text-align: center;
  border-radius: 5px;
  text-decoration: none;
  color: #333;
  &:hover {
    background-color: #d0d0d0;
  }
`;

const IndexPage = () => {
  const [largeGenres, setLargeGenres] = useState([]);

  useEffect(() => {
    const fetchLargeGenres = async () => {
      try {
        const db = getFirestore();
        const genresCollection = collection(db, "genres");
        const genresSnapshot = await getDocs(genresCollection);
        const genresData = genresSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(genre => genre.type === "large");
        setLargeGenres(genresData);
      } catch (error) {
        console.error("Error fetching large genres:", error);
      }
    };

    fetchLargeGenres();
  }, []);

  console.log("IndexPage component is rendering");

  return (
    <PageContainer>
      <MainContent>
        <Sidebar>
          <AdSpace text="広告枠" />
          <AdSpace text="有料掲載枠" />
        </Sidebar>
        <CenterContent>
          <h2>Welcome to MyTubeNavi</h2>
          <p>Search and discover the best YouTube videos!</p>
          <h3>ジャンル一覧</h3>
          <GenreGrid>
            {largeGenres.map((genre) => (
              <GenreItem key={genre.id} to={`/genre/${genre.slug}`}>
                {genre.name}
              </GenreItem>
            ))}
          </GenreGrid>
        </CenterContent>
        <Sidebar>
          <AdSpace text="広告枠" />
          <AdSpace text="有料掲載枠" />
        </Sidebar>
      </MainContent>
    </PageContainer>
  );
};

const ForceBuild = () => <div>Force Rebuild</div>;
export default IndexPage;