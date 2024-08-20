import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { SettingsProvider } from './contexts/SettingsContext';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import EditProfile from './pages/EditProfile';
import Header from './components/Header';
import theme from 'src/client/styles/theme';





const App = () => {
  return (
    <SettingsProvider>
      <ThemeProvider theme={theme.light}>
        <Router>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/edit-profile" element={<EditProfile />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default App;
