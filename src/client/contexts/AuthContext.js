import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await axios.get("/api/auth/profile");
      setUser(res.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to fetch user data");
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email, password) => {
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      setUser(res.data.user);
      localStorage.setItem("token", res.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      setError(null);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      setError(error.response?.data?.message || "Login failed");
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await axios.post("/api/auth/register", {
        username,
        email,
        password,
      });
      setUser(res.data.user);
      localStorage.setItem("token", res.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      setError(null);
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.response?.data?.message || "Registration failed");
      return false;
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setError(null);
  }, []);

  const updateUser = async (profileData) => {
    try {
      const res = await axios.put("/api/auth/profile", profileData);
      setUser(res.data);
      setError(null);
      return true;
    } catch (error) {
      console.error("Profile update error:", error);
      setError(error.response?.data?.message || "Profile update failed");
      return false;
    }
  };

  const resetPassword = async (email) => {
    try {
      await axios.post("/api/auth/reset-password", { email });
      setError(null);
      return true;
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error.response?.data?.message || "Password reset request failed");
      return false;
    }
  };

  // 新しく追加した関数：メールアドレス変更
  const changeEmail = async (newEmail) => {
    try {
      const res = await axios.put("/api/auth/change-email", { newEmail });
      setUser(res.data);
      setError(null);
      return true;
    } catch (error) {
      console.error("Email change error:", error);
      setError(error.response?.data?.message || "Email change failed");
      return false;
    }
  };

  // 新しく追加した関数：パスワード変更
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put("/api/auth/change-password", { currentPassword, newPassword });
      setError(null);
      return true;
    } catch (error) {
      console.error("Password change error:", error);
      setError(error.response?.data?.message || "Password change failed");
      return false;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        register, 
        logout, 
        loading, 
        error, 
        updateUser, 
        resetPassword,
        fetchUser,
        changeEmail,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};