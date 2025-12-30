import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireSubscription } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSubscription); // Version history is a premium feature

router.get('/', async (req, res) => {
  try {
    const { resume_id } = req.query;
    const result = await query(`SELECT rv.* FROM resume_versions rv INNER JOIN resumes r ON r.id = rv.resume_id WHERE r.created_by = $1 ${resume_id ? 'AND rv.resume_id = $2' : ''} ORDER BY rv.version_number DESC`, resume_id ? [req.user.id, resume_id] : [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('List versions error:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { resume_id, version_name, notes, data_snapshot } = req.body;
    if (!resume_id || !data_snapshot) {
      return res.status(400).json({ error: 'resume_id and data_snapshot required' });
    }
    const resumeCheck = await query('SELECT id FROM resumes WHERE id = $1 AND created_by = $2', [resume_id, req.user.id]);
    if (resumeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    const versionCount = await query('SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM resume_versions WHERE resume_id = $1', [resume_id]);
    const nextVersion = versionCount.rows[0].next_version;
    const result = await query('INSERT INTO resume_versions (resume_id, version_number, version_name, notes, data_snapshot, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [resume_id, nextVersion, version_name, notes, JSON.stringify(data_snapshot), req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { version_name, notes } = req.body;
    const result = await query('UPDATE resume_versions rv SET version_name = COALESCE($1, version_name), notes = COALESCE($2, notes) FROM resumes r WHERE rv.id = $3 AND rv.resume_id = r.id AND r.created_by = $4 RETURNING rv.*', [version_name, notes, req.params.id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update version error:', error);
    res.status(500).json({ error: 'Failed to update version' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM resume_versions rv USING resumes r WHERE rv.id = $1 AND rv.resume_id = r.id AND r.created_by = $2 RETURNING rv.id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }
    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Delete version error:', error);
    res.status(500).json({ error: 'Failed to delete version' });
  }
});

export default router;
