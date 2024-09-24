import React, { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useFirebase } from './FirebaseContext';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    console.warn('useSettings is being used outside of SettingsProvider. Using default values.');
    return {
      theme: 'light',
      language: 'ja',
      updateTheme: () => {},
      updateLanguage: () => {},
    };
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
  const { db } = useFirebase();
  const { currentUser } = useAuth();

  useEffect(() => {
    const loadSettings = async () => {
      if (currentUser) {
        const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
        const userSettingsSnap = await getDoc(userSettingsRef);

        if (userSettingsSnap.exists()) {
          const data = userSettingsSnap.data();
          if (data.theme && VALID_THEMES.includes(data.theme)) setTheme(data.theme);
          if (data.language && VALID_LANGUAGES.includes(data.language)) setLanguage(data.language);
        } else {
          // If no settings exist, create default settings
          await setDoc(userSettingsRef, { theme: DEFAULT_THEME, language: DEFAULT_LANGUAGE });
        }
      } else {
        // If user is not logged in, load from localStorage
        try {
          const savedTheme = localStorage.getItem('theme');
          const savedLanguage = localStorage.getItem('language');

          if (savedTheme && VALID_THEMES.includes(savedTheme)) setTheme(savedTheme);
          if (savedLanguage && VALID_LANGUAGES.includes(savedLanguage)) setLanguage(savedLanguage);
        } catch (error) {
          console.error('Error loading settings from localStorage:', error);
        }
      }
    };

    loadSettings();
  }, [currentUser, db]);

  const updateTheme = async (newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) {
      console.error(`Invalid theme: ${newTheme}. Must be one of: ${VALID_THEMES.join(', ')}`);
      return;
    }
    setTheme(newTheme);
    if (currentUser) {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      await setDoc(userSettingsRef, { theme: newTheme }, { merge: true });
    } else {
      try {
        localStorage.setItem('theme', newTheme);
      } catch (error) {
        console.error('Error saving theme to localStorage:', error);
      }
    }
  };

  const updateLanguage = async (newLanguage) => {
    if (!VALID_LANGUAGES.includes(newLanguage)) {
      console.error(`Invalid language: ${newLanguage}. Must be one of: ${VALID_LANGUAGES.join(', ')}`);
      return;
    }
    setLanguage(newLanguage);
    if (currentUser) {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      await setDoc(userSettingsRef, { language: newLanguage }, { merge: true });
    } else {
      try {
        localStorage.setItem('language', newLanguage);
      } catch (error) {
        console.error('Error saving language to localStorage:', error);
      }
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