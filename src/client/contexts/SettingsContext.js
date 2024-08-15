import React, { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const DEFAULT_THEME = 'light';
const DEFAULT_LANGUAGE = 'ja';
const VALID_THEMES = ['light', 'dark'];
const VALID_LANGUAGES = ['ja', 'en'];

export const SettingsProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      const savedLanguage = localStorage.getItem('language');

      if (savedTheme && VALID_THEMES.includes(savedTheme)) setTheme(savedTheme);
      if (savedLanguage && VALID_LANGUAGES.includes(savedLanguage)) setLanguage(savedLanguage);
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
  }, []);

  const updateTheme = (newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) {
      console.error(`Invalid theme: ${newTheme}. Must be one of: ${VALID_THEMES.join(', ')}`);
      return;
    }
    setTheme(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  };

  const updateLanguage = (newLanguage) => {
    if (!VALID_LANGUAGES.includes(newLanguage)) {
      console.error(`Invalid language: ${newLanguage}. Must be one of: ${VALID_LANGUAGES.join(', ')}`);
      return;
    }
    setLanguage(newLanguage);
    try {
      localStorage.setItem('language', newLanguage);
    } catch (error) {
      console.error('Error saving language to localStorage:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ theme, language, updateTheme, updateLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
};

SettingsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SettingsProvider;