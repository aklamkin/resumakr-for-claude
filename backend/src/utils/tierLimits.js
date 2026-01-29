/**
 * Tier Limits Configuration
 * Defines feature limits for free and paid tiers
 *
 * IMPORTANT: AI credits are per ACCOUNT (not per resume),
 * given once at signup, and never reset monthly.
 */

// Tier configuration (can later be moved to database)
export const TIER_LIMITS = {
  free: {
    aiCreditsTotal: 5,           // 5 credits TOTAL per account (lifetime, not monthly)
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
    aiCreditsTotal: Infinity,    // Unlimited for paid users
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
 * Check if user has AI credits remaining (for free users)
 * Paid users always return true (unlimited)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function hasAiCreditsRemaining(user) {
  if (getUserTier(user) === 'paid') return true;
  const used = user.ai_credits_used || 0;
  const total = user.ai_credits_total || 5;
  return used < total;
}

/**
 * Get remaining AI credits for user
 * @param {Object} user - User object
 * @returns {number} Remaining credits (Infinity for paid users)
 */
export function getRemainingAiCredits(user) {
  if (getUserTier(user) === 'paid') return Infinity;
  const used = user.ai_credits_used || 0;
  const total = user.ai_credits_total || 5;
  return Math.max(0, total - used);
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
