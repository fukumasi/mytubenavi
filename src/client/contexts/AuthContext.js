import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function googleSignIn() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  async function updateUserProfile(profile) {
    try {
      await updateProfile(auth.currentUser, profile);
      setCurrentUser(prevUser => ({ ...prevUser, ...profile }));
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  async function updateUserEmail(newEmail, password) {
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await updateEmail(auth.currentUser, newEmail);
      await sendEmailVerification(auth.currentUser);
      
      return { success: true, message: "Verification email sent to new address. Please check your email to confirm the change." };
    } catch (error) {
      console.error("Error updating user email:", error);
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('This email is already in use by another account.');
        case 'auth/invalid-email':
          throw new Error('The email address is not valid.');
        case 'auth/requires-recent-login':
          throw new Error('Please log out and log in again before changing your email.');
        case 'auth/operation-not-allowed':
          throw new Error('Email address change is not allowed. Please contact the administrator.');
        case 'auth/invalid-credential':
          throw new Error('The provided password is incorrect. Please try again.');
        default:
          throw new Error('An unexpected error occurred. Please try again later.');
      }
    }
  }

  async function updateUserPassword(currentPassword, newPassword) {
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
    } catch (error) {
      console.error("Error updating user password:", error);
      switch (error.code) {
        case 'auth/weak-password':
          throw new Error('The new password is too weak. Please choose a stronger password.');
        case 'auth/requires-recent-login':
          throw new Error('Please log out and log in again before changing your password.');
        case 'auth/invalid-credential':
          throw new Error('The current password is incorrect. Please try again.');
        default:
          throw new Error('An unexpected error occurred. Please try again later.');
      }
    }
  }

  function sendVerificationEmail() {
    return sendEmailVerification(auth.currentUser);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    googleSignIn,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    sendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}