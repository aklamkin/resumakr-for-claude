import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '@/api/apiClient';

const AuthContext = createContext(null);

// Default tier limits for free users (must match backend tierLimits.js)
const FREE_TIER_LIMITS = {
  aiCreditsPerMonth: 5,
  pdfDownloadsPerMonth: 5,
  maxResumesPerDay: 10,
  premiumTemplates: false,
  coverLetters: false,
  versionHistory: false,
  resumeParsing: false,
  atsDetailedInsights: false,
  watermarkPdf: true,
  // Must match TEMPLATE_OPTIONS ids in ResumeTemplate.jsx
  freeTemplateIds: ['classic-professional', 'modern-minimalist', 'creative-bold', 'executive-elegant', 'tech-sleek']
};

const PAID_TIER_LIMITS = {
  aiCreditsPerMonth: Infinity,
  pdfDownloadsPerMonth: Infinity,
  maxResumesPerDay: Infinity,
  premiumTemplates: true,
  coverLetters: true,
  versionHistory: true,
  resumeParsing: true,
  atsDetailedInsights: true,
  watermarkPdf: false,
  freeTemplateIds: null
};

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

  // Compute tier information from user data
  const tierInfo = useMemo(() => {
    if (!user) {
      return {
        tier: 'free',
        isPaid: false,
        limits: FREE_TIER_LIMITS,
        aiCredits: { total: 5, used: 0, remaining: 5 }
      };
    }

    const tier = user.tier || (user.is_subscribed ? 'paid' : 'free');
    const isPaid = tier === 'paid';
    const limits = user.tierLimits || (isPaid ? PAID_TIER_LIMITS : FREE_TIER_LIMITS);
    const aiCredits = user.aiCredits || {
      total: isPaid ? 999999 : 5,
      used: 0,
      remaining: isPaid ? 999999 : 5
    };

    return { tier, isPaid, limits, aiCredits };
  }, [user]);

  // Helper to check if a feature is available
  const canAccessFeature = (featureName) => {
    return tierInfo.limits[featureName] === true;
  };

  // Helper to check if user has AI credits remaining
  const hasAiCreditsRemaining = () => {
    if (tierInfo.isPaid) return true;
    return tierInfo.aiCredits.remaining > 0;
  };

  // Helper to check if a template is available
  const isTemplateAvailable = (templateId) => {
    if (tierInfo.isPaid) return true;
    return tierInfo.limits.freeTemplateIds?.includes(templateId) || false;
  };

  // Update AI credits locally (called after AI operations)
  const updateAiCredits = (newCredits) => {
    if (user && newCredits) {
      setUser(prev => ({
        ...prev,
        aiCredits: newCredits
      }));
    }
  };

  const value = {
    user,
    loading,
    initialized,
    login,
    register,
    logout,
    refreshUser: loadUser,
    // Tier-related values
    tier: tierInfo.tier,
    isPaid: tierInfo.isPaid,
    tierLimits: tierInfo.limits,
    aiCredits: tierInfo.aiCredits,
    // Tier helper functions
    canAccessFeature,
    hasAiCreditsRemaining,
    isTemplateAvailable,
    updateAiCredits,
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
