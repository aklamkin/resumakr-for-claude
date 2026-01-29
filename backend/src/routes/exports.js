/**
 * Export Routes
 * Handles PDF download tracking and limits for freemium model
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getPdfUsage, incrementPdfDownload, hasExceededPdfLimit } from '../utils/usageTracking.js';

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/exports/pdf-status
 * Check if user can download PDF and get current usage
 */
router.get('/pdf-status', async (req, res) => {
  try {
    const tier = req.user.effectiveTier;
    const limits = req.user.tierLimits;

    // Paid users have unlimited downloads
    if (tier === 'paid') {
      return res.json({
        canDownload: true,
        tier: 'paid',
        watermark: false,
        limit: null,
        used: null,
        remaining: null
      });
    }

    // Free users have limited downloads (synchronous — reads from req.user)
    const limit = limits.pdfDownloadsPerMonth;
    const pdfUsage = getPdfUsage(req.user, limit);

    res.json({
      canDownload: pdfUsage.remaining > 0,
      tier: 'free',
      watermark: limits.watermarkPdf,
      limit: pdfUsage.limit,
      used: pdfUsage.used,
      remaining: pdfUsage.remaining,
      message: pdfUsage.remaining <= 0
        ? 'You have reached your monthly PDF download limit. Upgrade for unlimited downloads.'
        : null,
      upgradeUrl: pdfUsage.remaining <= 0 ? '/pricing' : null
    });
  } catch (error) {
    console.error('PDF status error:', error);
    res.status(500).json({ error: 'Failed to check PDF status' });
  }
});

/**
 * POST /api/exports/pdf-download
 * Record a PDF download (call this after successful download on frontend)
 */
router.post('/pdf-download', async (req, res) => {
  try {
    const tier = req.user.effectiveTier;
    const limits = req.user.tierLimits;

    // Paid users don't need tracking
    if (tier === 'paid') {
      return res.json({
        success: true,
        tier: 'paid',
        watermark: false
      });
    }

    // Check if free user has exceeded limit (synchronous — reads from req.user)
    if (hasExceededPdfLimit(req.user, limits.pdfDownloadsPerMonth)) {
      return res.status(403).json({
        error: 'Download limit exceeded',
        message: 'You have reached your monthly PDF download limit. Upgrade for unlimited downloads.',
        tier: 'free',
        upgradeUrl: '/pricing'
      });
    }

    // Record the download (async — updates users table)
    const used = await incrementPdfDownload(req.user.id);

    const limit = limits.pdfDownloadsPerMonth;
    const remaining = Math.max(0, limit - used);

    res.json({
      success: true,
      tier: 'free',
      watermark: limits.watermarkPdf,
      limit,
      used,
      remaining,
      message: remaining <= 0
        ? 'This was your last free PDF download this month. Upgrade for unlimited downloads.'
        : `You have ${remaining} PDF download${remaining !== 1 ? 's' : ''} remaining this month.`
    });
  } catch (error) {
    console.error('PDF download tracking error:', error);
    res.status(500).json({ error: 'Failed to record download' });
  }
});

export default router;
