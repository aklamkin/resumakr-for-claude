/**
 * Usage Tracking Utilities
 * Tracks PDF downloads, resume creation, and AI credit usage.
 *
 * All monthly counters (AI credits, PDF downloads) live on the users table
 * with a usage_period (YYYY-MM) column. When the month rolls over, the auth
 * middleware resets counters to 0 — no cron job, no separate table needed.
 */

import { query } from '../config/database.js';

const AI_CREDITS_PER_MONTH = 5;
const PDF_DOWNLOADS_PER_MONTH = 5;

// ============================================
// PERIOD MANAGEMENT
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
 * Ensure the user's usage_period matches the current month.
 * If stale or null, reset counters to 0. Called by auth middleware.
 * Mutates the user object in-place for the current request.
 * @param {Object} user - User object from DB (must have id, usage_period, etc.)
 */
export async function ensureCurrentPeriod(user) {
  const currentPeriod = getCurrentYearMonth();
  if (user.usage_period === currentPeriod) return;

  // Period rolled over (or first request ever) — reset counters
  await query(
    `UPDATE users
     SET usage_period = $2, ai_credits_used_this_period = 0, pdf_downloads_this_period = 0
     WHERE id = $1 AND (usage_period IS NULL OR usage_period != $2)`,
    [user.id, currentPeriod]
  );
  user.usage_period = currentPeriod;
  user.ai_credits_used_this_period = 0;
  user.pdf_downloads_this_period = 0;
}

// ============================================
// AI CREDITS (monthly, on users table)
// ============================================

/**
 * Get user's AI credit balance from their user object (synchronous).
 * The auth middleware ensures usage_period is current before this is called.
 * @param {Object} user - User object with effectiveTier and usage fields
 * @returns {{ total: number, used: number, remaining: number }}
 */
export function getUserAiCredits(user) {
  if (user.effectiveTier === 'paid') {
    return { total: 999999, used: 0, remaining: 999999 };
  }
  const used = user.ai_credits_used_this_period || 0;
  return {
    total: AI_CREDITS_PER_MONTH,
    used,
    remaining: Math.max(0, AI_CREDITS_PER_MONTH - used)
  };
}

/**
 * Deduct AI credit(s) and log usage.
 * @param {string} userId - User UUID
 * @param {string|null} resumeId - Optional resume UUID
 * @param {string} action - Action type (e.g., 'improve_summary', 'analyze_ats')
 * @param {number} credits - Number of credits to deduct (default: 1)
 * @returns {{ total: number, used: number, remaining: number }}
 */
export async function deductAiCredit(userId, resumeId, action, credits = 1) {
  // Increment on users table
  const result = await query(
    `UPDATE users
     SET ai_credits_used_this_period = COALESCE(ai_credits_used_this_period, 0) + $2
     WHERE id = $1
     RETURNING ai_credits_used_this_period`,
    [userId, credits]
  );

  // Log for analytics
  await query(
    `INSERT INTO ai_usage_log (user_id, resume_id, action, credits_used, user_tier)
     SELECT $1, $2, $3, $4, user_tier FROM users WHERE id = $1`,
    [userId, resumeId, action, credits]
  );

  const used = result.rows[0]?.ai_credits_used_this_period || 0;
  return {
    total: AI_CREDITS_PER_MONTH,
    used,
    remaining: Math.max(0, AI_CREDITS_PER_MONTH - used)
  };
}

// ============================================
// PDF DOWNLOADS (monthly, on users table)
// ============================================

/**
 * Get PDF download usage from user object (synchronous).
 * @param {Object} user - User object
 * @param {number} limit - Monthly download limit
 * @returns {{ used: number, limit: number, remaining: number }}
 */
export function getPdfUsage(user, limit) {
  if (user.effectiveTier === 'paid') {
    return { used: 0, limit: null, remaining: null };
  }
  const used = user.pdf_downloads_this_period || 0;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used)
  };
}

/**
 * Check if user has exceeded monthly PDF download limit (synchronous).
 * @param {Object} user - User object
 * @param {number} limit - Monthly limit
 * @returns {boolean}
 */
export function hasExceededPdfLimit(user, limit) {
  return (user.pdf_downloads_this_period || 0) >= limit;
}

/**
 * Increment PDF download count on users table.
 * @param {string} userId - User UUID
 * @returns {number} Updated download count
 */
export async function incrementPdfDownload(userId) {
  const result = await query(
    `UPDATE users
     SET pdf_downloads_this_period = COALESCE(pdf_downloads_this_period, 0) + 1
     WHERE id = $1
     RETURNING pdf_downloads_this_period`,
    [userId]
  );
  return result.rows[0]?.pdf_downloads_this_period || 0;
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
// TIER MANAGEMENT
// ============================================

/**
 * Reset user to free tier (on subscription cancellation).
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

  if (userTier === 'paid') {
    return { allowed: true, template };
  }

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
