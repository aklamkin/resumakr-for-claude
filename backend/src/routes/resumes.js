import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireSubscription } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createResumeSchema, updateResumeSchema, uuidParamSchema, resumeQuerySchema } from '../validators/schemas.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSubscription); // All resume operations require active subscription

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
    // Data validated by middleware
    const { title, status, source_type } = req.body;
    const { file_url, last_edited_step } = req.body; // These pass through without strict validation for now

    const result = await query('INSERT INTO resumes (title, status, source_type, file_url, last_edited_step, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [title, status, source_type, file_url, last_edited_step, req.user.id]);
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
