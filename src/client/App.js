import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import Home from './components/Home';
import Header from './components/Header';
import VideoDetail from './components/VideoDetail';
import SearchResults from './components/SearchResults';  // 新しく追加

const AppContainer = styled.div`
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
`;

const App = () => {
  return (
    <Router>
      <AppContainer>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/video/:id" element={<VideoDetail />} />
          <Route path="/search" element={<SearchResults />} />  // 新しく追加
          {/* 他のルートをここに追加 */}
        </Routes>
      </AppContainer>
    </Router>
  );
};

export default App;