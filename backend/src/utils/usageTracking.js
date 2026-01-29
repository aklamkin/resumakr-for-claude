/**
 * Usage Tracking Utilities
 * Tracks PDF downloads, resume creation, and AI credit usage
 *
 * IMPORTANT: AI credits are per ACCOUNT (lifetime), not per resume or monthly.
 * Free users get 5 credits at signup that never reset.
 */

import { query } from '../config/database.js';

// ============================================
// MONTHLY USAGE (PDF downloads only)
// ============================================

/**
 * Get current month string in YYYY-MM format
 * @returns {string}
 */
export function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get or create monthly usage record for a user
 * @param {string} userId - User UUID
 * @returns {Object} Monthly usage record
 */
export async function getMonthlyUsage(userId) {
  const yearMonth = getCurrentYearMonth();

  // Upsert pattern - create if not exists, return current values
  const result = await query(`
    INSERT INTO user_monthly_usage (user_id, year_month)
    VALUES ($1, $2)
    ON CONFLICT (user_id, year_month) DO UPDATE SET updated_at = NOW()
    RETURNING *
  `, [userId, yearMonth]);

  return result.rows[0];
}

/**
 * Increment PDF download count for current month
 * @param {string} userId - User UUID
 * @returns {Object} Updated usage record
 */
export async function incrementPdfDownload(userId) {
  const yearMonth = getCurrentYearMonth();

  const result = await query(`
    INSERT INTO user_monthly_usage (user_id, year_month, pdf_downloads)
    VALUES ($1, $2, 1)
    ON CONFLICT (user_id, year_month)
    DO UPDATE SET pdf_downloads = user_monthly_usage.pdf_downloads + 1, updated_at = NOW()
    RETURNING *
  `, [userId, yearMonth]);

  return result.rows[0];
}

/**
 * Check if user has exceeded monthly PDF download limit
 * @param {string} userId - User UUID
 * @param {number} limit - Monthly limit
 * @returns {boolean} True if limit exceeded
 */
export async function hasExceededPdfLimit(userId, limit) {
  const usage = await getMonthlyUsage(userId);
  return (usage.pdf_downloads || 0) >= limit;
}

// ============================================
// RESUME CREATION RATE LIMITING
// ============================================

/**
 * Get count of resumes created by user in last 24 hours
 * @param {string} userId - User UUID
 * @returns {number} Count of resumes created
 */
export async function getResumesCreatedLast24Hours(userId) {
  const result = await query(`
    SELECT COUNT(*) as count
    FROM resume_creation_log
    WHERE user_id = $1
    AND created_at > NOW() - INTERVAL '24 hours'
  `, [userId]);

  return parseInt(result.rows[0].count, 10) || 0;
}

/**
 * Check if user can create a new resume (rate limiting)
 * @param {string} userId - User UUID
 * @param {number} limit - Max resumes per 24 hours
 * @returns {Object} { allowed: boolean, count: number, resetIn: string }
 */
export async function canCreateResume(userId, limit) {
  const count = await getResumesCreatedLast24Hours(userId);

  if (count >= limit) {
    // Find when the oldest resume in the 24hr window was created
    const oldestResult = await query(`
      SELECT created_at
      FROM resume_creation_log
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT 1
    `, [userId]);

    let resetIn = 'less than 24 hours';
    if (oldestResult.rows[0]) {
      const oldestTime = new Date(oldestResult.rows[0].created_at);
      const resetTime = new Date(oldestTime.getTime() + 24 * 60 * 60 * 1000);
      const hoursRemaining = Math.ceil((resetTime - Date.now()) / (60 * 60 * 1000));
      resetIn = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
    }

    return { allowed: false, count, resetIn };
  }

  return { allowed: true, count, resetIn: null };
}

/**
 * Log a resume creation for rate limiting
 * @param {string} userId - User UUID
 * @param {string} resumeId - Resume UUID
 */
export async function logResumeCreation(userId, resumeId) {
  await query(`
    INSERT INTO resume_creation_log (user_id, resume_id)
    VALUES ($1, $2)
  `, [userId, resumeId]);
}

// ============================================
// AI CREDITS - ACCOUNT LEVEL (NOT PER RESUME)
// ============================================

/**
 * Get user's AI credit balance
 * @param {string} userId - User UUID
 * @returns {Object} { total, used, remaining }
 */
export async function getUserAiCredits(userId) {
  const result = await query(`
    SELECT ai_credits_total, ai_credits_used
    FROM users
    WHERE id = $1
  `, [userId]);

  if (!result.rows[0]) {
    return { total: 5, used: 0, remaining: 5 };
  }

  const { ai_credits_total, ai_credits_used } = result.rows[0];
  const total = ai_credits_total ?? 5;
  const used = ai_credits_used ?? 0;

  return {
    total,
    used,
    remaining: Math.max(0, total - used)
  };
}

/**
 * Check if user has AI credits remaining
 * @param {string} userId - User UUID
 * @returns {boolean}
 */
export async function hasAiCreditsRemaining(userId) {
  const credits = await getUserAiCredits(userId);
  return credits.remaining > 0;
}

/**
 * Deduct AI credit(s) from user's account and log usage
 * @param {string} userId - User UUID
 * @param {string|null} resumeId - Optional resume UUID
 * @param {string} action - Action type (e.g., 'improve_summary', 'analyze_ats')
 * @param {number} credits - Number of credits to deduct (default: 1)
 * @returns {Object} Updated credit balance
 */
export async function deductAiCredit(userId, resumeId, action, credits = 1) {
  // Update user's credit balance
  await query(`
    UPDATE users
    SET ai_credits_used = COALESCE(ai_credits_used, 0) + $2
    WHERE id = $1
  `, [userId, credits]);

  // Log the usage for analytics
  await query(`
    INSERT INTO ai_usage_log (user_id, resume_id, action, credits_used, user_tier)
    SELECT $1, $2, $3, $4, user_tier FROM users WHERE id = $1
  `, [userId, resumeId, action, credits]);

  // Return updated balance
  return getUserAiCredits(userId);
}

/**
 * Grant additional AI credits to a user (for promotions, support, etc.)
 * @param {string} userId - User UUID
 * @param {number} credits - Credits to add
 * @returns {Object} Updated credit balance
 */
export async function grantAiCredits(userId, credits) {
  await query(`
    UPDATE users
    SET ai_credits_total = COALESCE(ai_credits_total, 5) + $2
    WHERE id = $1
  `, [userId, credits]);

  return getUserAiCredits(userId);
}

/**
 * Set unlimited AI credits for paid user (on subscription activation)
 * @param {string} userId - User UUID
 */
export async function setUnlimitedAiCredits(userId) {
  await query(`
    UPDATE users
    SET ai_credits_total = 999999, ai_credits_used = 0, user_tier = 'paid'
    WHERE id = $1
  `, [userId]);
}

/**
 * Reset user to free tier credits (on subscription cancellation)
 * Note: We keep their used count - they don't get credits back
 * @param {string} userId - User UUID
 */
export async function resetToFreeTier(userId) {
  await query(`
    UPDATE users
    SET user_tier = 'free', tier_updated_at = NOW()
    WHERE id = $1
  `, [userId]);
}

// ============================================
// TEMPLATE ACCESS
// ============================================

/**
 * Check if a template is available for a user
 * @param {string} templateId - Template identifier
 * @param {string} userTier - User's tier ('paid' or 'free')
 * @returns {Promise<Object>} { allowed: boolean, template: Object|null }
 */
export async function checkTemplateAccess(templateId, userTier) {
  const result = await query(`
    SELECT * FROM templates
    WHERE id = $1 AND is_active = true
  `, [templateId]);

  if (!result.rows[0]) {
    return { allowed: false, template: null, reason: 'Template not found' };
  }

  const template = result.rows[0];

  // Paid users can access all templates
  if (userTier === 'paid') {
    return { allowed: true, template };
  }

  // Free users can only access non-premium templates
  if (template.is_premium) {
    return {
      allowed: false,
      template,
      reason: 'This template requires a paid subscription'
    };
  }

  return { allowed: true, template };
}

/**
 * Get all templates, marking which are available for user's tier
 * @param {string} userTier - User's tier ('paid' or 'free')
 * @returns {Promise<Array>} Templates with 'available' flag
 */
export async function getTemplatesForTier(userTier) {
  const result = await query(`
    SELECT * FROM templates
    WHERE is_active = true
    ORDER BY sort_order ASC
  `);

  return result.rows.map(template => ({
    ...template,
    available: userTier === 'paid' || !template.is_premium
  }));
}
