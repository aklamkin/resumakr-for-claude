/**
 * Tier Limits Configuration
 * Defines feature limits for free and paid tiers
 *
 * AI credits and PDF downloads both reset monthly.
 * Free users get 5 of each per calendar month.
 */

// Tier configuration (can later be moved to database)
export const TIER_LIMITS = {
  free: {
    aiCreditsPerMonth: 5,        // 5 AI credits per month
    pdfDownloadsPerMonth: 5,     // 5 downloads per month for free users
    maxResumesPerDay: 10,        // Increased from 3 for testing
    premiumTemplates: false,
    coverLetters: false,
    versionHistory: false,
    resumeParsing: false,
    atsDetailedInsights: false,  // Free users only get ATS score, not detailed insights
    watermarkPdf: true,
    // Must match frontend TEMPLATE_OPTIONS ids in ResumeTemplate.jsx
    freeTemplateIds: ['classic-professional', 'modern-minimalist', 'creative-bold', 'executive-elegant', 'tech-sleek']
  },
  paid: {
    aiCreditsPerMonth: Infinity,  // Unlimited for paid users
    pdfDownloadsPerMonth: Infinity,
    maxResumesPerDay: Infinity,
    premiumTemplates: true,
    coverLetters: true,
    versionHistory: true,
    resumeParsing: true,
    atsDetailedInsights: true,
    watermarkPdf: false,
    freeTemplateIds: null // all templates available
  }
};

/**
 * Determine user's effective tier based on subscription status
 * @param {Object} user - User object with is_subscribed and subscription_end_date
 * @returns {string} 'paid' or 'free'
 */
export function getUserTier(user) {
  if (!user) return 'free';

  // Paid user = active subscription that hasn't expired
  if (user.is_subscribed && user.subscription_end_date) {
    const endDate = new Date(user.subscription_end_date);
    if (endDate > new Date()) {
      return 'paid';
    }
  }
  return 'free';
}

/**
 * Get the limits object for a given tier
 * @param {string} tier - 'paid' or 'free'
 * @returns {Object} Tier limits configuration
 */
export function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * @deprecated Use getUserAiCredits() from usageTracking.js instead.
 * AI credits are now tracked monthly in user_monthly_usage table.
 * This synchronous helper only checks tier — for actual credit counts,
 * use the async getUserAiCredits(userId, tier) function.
 */
export function hasAiCreditsRemaining(user) {
  return getUserTier(user) === 'paid';
}

/**
 * @deprecated Use getUserAiCredits() from usageTracking.js instead.
 */
export function getRemainingAiCredits(user) {
  if (getUserTier(user) === 'paid') return Infinity;
  return 0; // Must use async getUserAiCredits() for actual count
}

/**
 * Check if a template is available for a user's tier
 * @param {string} templateId - Template identifier
 * @param {string} tier - User's tier ('paid' or 'free')
 * @returns {boolean}
 */
export function isTemplateAvailable(templateId, tier) {
  if (tier === 'paid') return true;
  const limits = TIER_LIMITS.free;
  return limits.freeTemplateIds.includes(templateId);
}

/**
 * Check if user can access a specific feature
 * @param {Object} user - User object
 * @param {string} feature - Feature key from TIER_LIMITS
 * @returns {boolean}
 */
export function canAccessFeature(user, feature) {
  const tier = getUserTier(user);
  const limits = getTierLimits(tier);
  return !!limits[feature];
}
