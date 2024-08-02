import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { QueryClient, QueryClientProvider } from 'react-query';
import GlobalStyle from './styles/GlobalStyle';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import {
  Home,
  SearchResults,
  VideoDetail,
  Profile,
  GenrePage,
  Login,
  Register,
  ForgotPassword,
  ResetPassword
} from './pages';

const queryClient = new QueryClient();

const AppContainer = styled.div`
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
`;

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ErrorBoundary>
          <GlobalStyle />
          <AppContainer>
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/video/:id" element={<VideoDetail />} />
              <Route path="/genre/:genreSlug" element={<GenrePage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </AppContainer>
        </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  );
};

export default App;