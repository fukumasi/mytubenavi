import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "react-query";
import GlobalStyle from "./styles/GlobalStyle";
import Header from "./components/Header";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import theme from "./styles/theme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";

const Home = React.lazy(() => import("./pages/Home"));
const SearchResults = React.lazy(() => import("./pages/SearchResults"));
const VideoDetail = React.lazy(() => import("./pages/VideoDetail"));
const Profile = React.lazy(() => import("./pages/Profile"));
const GenrePage = React.lazy(() => import("./pages/GenrePage"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

const AppContainer = styled.div`
  font-family: Arial, sans-serif;
  margin: 0 auto;
  padding: 0 20px;
  max-width: 1200px;

  @media (max-width: 768px) {
    padding: 0 10px;
  }
`;

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : <Navigate to="/login" />;
};

const ThemedApp = () => {
  const { theme: currentTheme } = useSettings();
  return (
    <ThemeProvider theme={theme[currentTheme]}>
      <GlobalStyle />
      <AppContainer>
        <Header />
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/video/:id" element={<VideoDetail />} />
            <Route path="/genre/:genreSlug" element={<GenrePage />} />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Suspense>
      </AppContainer>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <ErrorBoundary>
              <ThemedApp />
            </ErrorBoundary>
          </Router>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;