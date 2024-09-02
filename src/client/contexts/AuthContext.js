import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await axios.get("/api/auth/profile");
      setUser(res.data);
      setIsAuthenticated(true);
      setError(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Failed to fetch user data");
      setIsAuthenticated(false);
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
      setIsAuthenticated(false);
    }
  }, [fetchUser]);

  const login = async (email, password, rememberMe, twoFactorCode = null) => {
    try {
      const res = await axios.post("/api/auth/login", { email, password, twoFactorCode });
      if (res.data.requireTwoFactor) {
        setTwoFactorRequired(true);
        return { requireTwoFactor: true };
      }
      setUser(res.data.user);
      setIsAuthenticated(true);
      setTwoFactorRequired(false);
      if (rememberMe) {
        localStorage.setItem("token", res.data.token);
      }
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      setError(null);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      setError(error.response?.data?.message || "Login failed");
      return { success: false, error: error.response?.data?.message || "Login failed" };
    }
  };

  const register = async (username, email, password, userType) => {
    try {
      const res = await axios.post("/api/auth/register", {
        username,
        email,
        password,
        userType
      });
      setError(null);
      return { success: true, message: res.data.message };
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.response?.data?.message || "Registration failed");
      return { success: false, error: error.response?.data?.message || "Registration failed" };
    }
  };

  const logout = useCallback(async () => {
    try {
      await axios.post("/api/auth/logout");
      setUser(null);
      setIsAuthenticated(false);
      setTwoFactorRequired(false);
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      setError(null);
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.response?.data?.message || "Logout failed");
    }
  }, []);

  const updateUser = async (profileData) => {
    try {
      const res = await axios.put("/api/auth/update-profile", profileData);
      setUser(res.data.user);
      setError(null);
      return { success: true };
    } catch (error) {
      console.error("Profile update error:", error);
      setError(error.response?.data?.message || "Profile update failed");
      return { success: false, error: error.response?.data?.message || "Profile update failed" };
    }
  };

  const resetPassword = async (email) => {
    try {
      const res = await axios.post("/api/auth/forgot-password", { email });
      setError(null);
      return { success: true, message: res.data.message };
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error.response?.data?.message || "Password reset request failed");
      return { success: false, error: error.response?.data?.message || "Password reset request failed" };
    }
  };

  const changeEmail = async (newEmail) => {
    try {
      const res = await axios.put("/api/auth/change-email", { newEmail });
      setUser(res.data.user);
      setError(null);
      return { success: true, message: res.data.message };
    } catch (error) {
      console.error("Email change error:", error);
      setError(error.response?.data?.message || "Email change failed");
      return { success: false, error: error.response?.data?.message || "Email change failed" };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await axios.put("/api/auth/change-password", { currentPassword, newPassword });
      setError(null);
      return { success: true, message: res.data.message };
    } catch (error) {
      console.error("Password change error:", error);
      setError(error.response?.data?.message || "Password change failed");
      return { success: false, error: error.response?.data?.message || "Password change failed" };
    }
  };

  const enable2FA = async () => {
    try {
      const res = await axios.post("/api/auth/enable-2fa");
      setUser({ ...user, isTwoFactorEnabled: true });
      return { success: true, qrCode: res.data.qrCode, secret: res.data.secret };
    } catch (error) {
      console.error("Enable 2FA error:", error);
      setError(error.response?.data?.message || "Failed to enable 2FA");
      return { success: false, error: error.response?.data?.message || "Failed to enable 2FA" };
    }
  };

  const disable2FA = async () => {
    try {
      await axios.post("/api/auth/disable-2fa");
      setUser({ ...user, isTwoFactorEnabled: false });
      return { success: true };
    } catch (error) {
      console.error("Disable 2FA error:", error);
      setError(error.response?.data?.message || "Failed to disable 2FA");
      return { success: false, error: error.response?.data?.message || "Failed to disable 2FA" };
    }
  };

  const verify2FACode = async (code) => {
    try {
      const res = await axios.post("/api/auth/verify-2fa", { code });
      setUser(res.data.user);
      setIsAuthenticated(true);
      setTwoFactorRequired(false);
      localStorage.setItem("token", res.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      setError(null);
      return { success: true };
    } catch (error) {
      console.error("2FA verification error:", error);
      setError(error.response?.data?.message || "2FA verification failed");
      return { success: false, error: error.response?.data?.message || "2FA verification failed" };
    }
  };

  const getLoginHistory = async () => {
    try {
      const res = await axios.get("/api/auth/login-history");
      return { success: true, loginHistory: res.data.loginHistory };
    } catch (error) {
      console.error("Get login history error:", error);
      setError(error.response?.data?.message || "Failed to get login history");
      return { success: false, error: error.response?.data?.message || "Failed to get login history" };
    }
  };

  const getActiveSessions = async () => {
    try {
      const res = await axios.get("/api/auth/active-sessions");
      return { success: true, activeSessions: res.data.activeSessions };
    } catch (error) {
      console.error("Get active sessions error:", error);
      setError(error.response?.data?.message || "Failed to get active sessions");
      return { success: false, error: error.response?.data?.message || "Failed to get active sessions" };
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await axios.delete(`/api/auth/revoke-session/${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error("Revoke session error:", error);
      setError(error.response?.data?.message || "Failed to revoke session");
      return { success: false, error: error.response?.data?.message || "Failed to revoke session" };
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
        isAuthenticated,
        twoFactorRequired,
        updateUser, 
        resetPassword,
        fetchUser,
        changeEmail,
        changePassword,
        enable2FA,
        disable2FA,
        verify2FACode,
        getLoginHistory,
        getActiveSessions,
        revokeSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};