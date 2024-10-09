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
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  updateUser, 
  changeEmail, 
  changePassword, 
  getUserProfile, 
  deleteUser as apiDeleteUser,
  getUserDashboardData
} from '../api/userApi';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      return userCredential;
    } catch (error) {
      console.error("Error during signup:", error);
      throw error;
    }
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
      await updateUser(profile);
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
      
      await changeEmail(newEmail);
      await sendEmailVerification(auth.currentUser);
      
      return { success: true, message: "Verification email sent to new address. Please check your email to confirm the change." };
    } catch (error) {
      console.error("Error updating user email:", error);
      throw error;
    }
  }

  async function updateUserPassword(currentPassword, newPassword) {
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await changePassword(newPassword);
    } catch (error) {
      console.error("Error updating user password:", error);
      throw error;
    }
  }

  function sendVerificationEmail() {
    return sendEmailVerification(auth.currentUser);
  }

  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: "パスワードリセットメールを送信しました。メールをご確認ください。" };
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw new Error('パスワードリセットメールの送信に失敗しました。');
    }
  }

  async function deleteAccount(password) {
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await apiDeleteUser();
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }

  async function fetchUserProfile() {
    if (currentUser) {
      try {
        const profile = await getUserProfile(currentUser.uid);
        setCurrentUser(prevUser => ({ ...prevUser, ...profile }));
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }
  }

  async function fetchDashboardData() {
    if (currentUser) {
      try {
        return await getUserDashboardData(currentUser.uid);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        throw error;
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        fetchUserProfile();
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isEmailVerified: currentUser?.emailVerified || false,
    signup,
    login,
    logout,
    googleSignIn,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    sendVerificationEmail,
    resetPassword,
    deleteAccount,
    fetchUserProfile,
    fetchDashboardData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}