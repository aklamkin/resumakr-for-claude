import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createResumeSchema, updateResumeSchema, uuidParamSchema, resumeQuerySchema } from '../validators/schemas.js';
import { canCreateResume, logResumeCreation } from '../utils/usageTracking.js';

const router = express.Router();
router.use(authenticate);
// NOTE: requireSubscription removed - freemium users can access resumes

// Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'title', 'status'];
const COLUMN_MAPPING = {
  'updated_date': 'updated_at',
  'created_date': 'created_at'
};

router.get('/', validate(resumeQuerySchema, 'query'), async (req, res) => {
  try {
    const { status, sort = '-created_at', limit = 100 } = req.query;
    let sql = 'SELECT * FROM resumes WHERE created_by = $1';
    const params = [req.user.id];
    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    // Safely handle sort column with whitelist
    let sortColumn = sort.startsWith('-') ? sort.substring(1) : sort;
    sortColumn = COLUMN_MAPPING[sortColumn] || sortColumn;

    // Validate sort column against whitelist
    if (!ALLOWED_SORT_COLUMNS.includes(sortColumn)) {
      sortColumn = 'created_at';
    }

    const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortColumn} ${sortDirection} LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('List resumes error:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

router.get('/:id', validate(uuidParamSchema, 'params'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM resumes WHERE id = $1 AND created_by = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

router.post('/', validate(createResumeSchema), async (req, res) => {
  try {
    // Rate limit check for free users (3 resumes per 24 hours)
    if (req.user.effectiveTier === 'free') {
      const rateLimit = await canCreateResume(req.user.id, req.user.tierLimits.maxResumesPerDay);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Free accounts can create up to ${req.user.tierLimits.maxResumesPerDay} resumes per day. Try again in ${rateLimit.resetIn}.`,
          resumesCreated: rateLimit.count,
          limit: req.user.tierLimits.maxResumesPerDay,
          resetIn: rateLimit.resetIn,
          upgradeUrl: '/pricing'
        });
      }
    }

    // Check max_resumes_per_user setting
    const settingResult = await query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'max_resumes_per_user'"
    );
    if (settingResult.rows.length > 0) {
      const maxResumes = parseInt(settingResult.rows[0].setting_value, 10);
      if (maxResumes > 0) {
        const countResult = await query(
          'SELECT COUNT(*) AS count FROM resumes WHERE created_by = $1',
          [req.user.id]
        );
        const currentCount = parseInt(countResult.rows[0].count, 10);
        if (currentCount >= maxResumes) {
          return res.status(403).json({
            error: 'Resume limit reached',
            message: `You have reached the maximum of ${maxResumes} resumes. Please delete an existing resume before creating a new one.`,
            currentCount,
            limit: maxResumes
          });
        }
      }
    }

    // Data validated by middleware
    const { title, status, source_type } = req.body;
    const { file_url, last_edited_step } = req.body; // These pass through without strict validation for now

    const result = await query('INSERT INTO resumes (title, status, source_type, file_url, last_edited_step, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [title, status, source_type, file_url, last_edited_step, req.user.id]);

    // Log resume creation for rate limiting (free users only)
    if (req.user.effectiveTier === 'free') {
      await logResumeCreation(req.user.id, result.rows[0].id);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create resume error:', error);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

router.put('/:id', validate(uuidParamSchema, 'params'), validate(updateResumeSchema), async (req, res) => {
  try {
    const allowedFields = ['title', 'status', 'file_url', 'last_edited_step'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const result = await query(`UPDATE resumes SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} AND created_by = $${fields.length + 2} RETURNING *`, [...values, req.params.id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update resume error:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

router.delete('/:id', validate(uuidParamSchema, 'params'), async (req, res) => {
  try {
    const result = await query('DELETE FROM resumes WHERE id = $1 AND created_by = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json({ message: 'Resume deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

export default router;
