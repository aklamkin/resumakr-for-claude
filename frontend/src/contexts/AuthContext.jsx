import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem('resumakr_token');
    if (!token) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch (err) {
      console.error('Error loading user:', err);
      localStorage.removeItem('resumakr_token');
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (email, password, full_name) => {
    const data = await api.auth.register(email, password, full_name);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('resumakr_token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    initialized,
    login,
    register,
    logout,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
