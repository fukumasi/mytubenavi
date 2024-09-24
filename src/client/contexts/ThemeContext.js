import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { lightTheme, darkTheme } from '../styles/theme';
import { useFirebase } from './FirebaseContext';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const { db } = useFirebase();
  const { currentUser } = useAuth();

  useEffect(() => {
    const loadTheme = async () => {
      if (currentUser) {
        const userThemeRef = doc(db, 'userThemes', currentUser.uid);
        const userThemeSnap = await getDoc(userThemeRef);

        if (userThemeSnap.exists()) {
          const { theme } = userThemeSnap.data();
          if (theme === 'light' || theme === 'dark') {
            setCurrentTheme(theme);
          }
        } else {
          // If no theme exists, create default theme
          await setDoc(userThemeRef, { theme: 'light' });
        }
      } else {
        // If user is not logged in, load from localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setCurrentTheme(savedTheme);
        }
      }
    };

    loadTheme();
  }, [currentUser, db]);

  const toggleTheme = async () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);

    if (currentUser) {
      const userThemeRef = doc(db, 'userThemes', currentUser.uid);
      await setDoc(userThemeRef, { theme: newTheme }, { merge: true });
    } else {
      localStorage.setItem('theme', newTheme);
    }
  };

  const theme = useMemo(() => {
    return currentTheme === 'light' ? lightTheme : darkTheme;
  }, [currentTheme]);

  const contextValue = useMemo(() => {
    return { theme, currentTheme, toggleTheme };
  }, [theme, currentTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};