import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/by-resume/:resumeId', async (req, res) => {
  try {
    const result = await query('SELECT rd.* FROM resume_data rd INNER JOIN resumes r ON r.id = rd.resume_id WHERE rd.resume_id = $1 AND r.created_by = $2', [req.params.resumeId, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume data not found' });
    }

    // Map database 'summary' field to frontend 'professional_summary'
    const data = result.rows[0];
    if (data.summary !== undefined) {
      data.professional_summary = data.summary;
      delete data.summary;
    }

    res.json(data);
  } catch (error) {
    console.error('Get resume data error:', error);
    res.status(500).json({ error: 'Failed to fetch resume data' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      resume_id,
      personal_info,
      professional_summary,
      work_experience,
      education,
      skills,
      certifications,
      projects,
      languages,
      job_description,
      template_id,
      template_name,
      template_custom_colors,
      template_custom_fonts,
      cover_letter_short,
      cover_letter_long,
      ai_metadata,
      version_history,
      ats_analysis_results
    } = req.body;

    if (!resume_id) {
      return res.status(400).json({ error: 'resume_id is required' });
    }

    const resumeCheck = await query('SELECT id FROM resumes WHERE id = $1 AND created_by = $2', [resume_id, req.user.id]);
    if (resumeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const result = await query(
      `INSERT INTO resume_data (
        resume_id,
        personal_info,
        professional_summary,
        work_experience,
        education,
        skills,
        certifications,
        projects,
        languages,
        job_description,
        template_id,
        template_name,
        template_custom_colors,
        template_custom_fonts,
        cover_letter_short,
        cover_letter_long,
        ai_metadata,
        version_history,
        ats_analysis_results,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
      [
        resume_id,
        personal_info ? JSON.stringify(personal_info) : '{}',
        professional_summary || '',
        work_experience ? JSON.stringify(work_experience) : '[]',
        education ? JSON.stringify(education) : '[]',
        skills ? JSON.stringify(skills) : '[]',
        certifications ? JSON.stringify(certifications) : '[]',
        projects ? JSON.stringify(projects) : '[]',
        languages ? JSON.stringify(languages) : '[]',
        job_description || null,
        template_id || null,
        template_name || null,
        template_custom_colors ? JSON.stringify(template_custom_colors) : '{}',
        template_custom_fonts ? JSON.stringify(template_custom_fonts) : '{}',
        cover_letter_short || null,
        cover_letter_long || null,
        ai_metadata ? JSON.stringify(ai_metadata) : '{}',
        version_history ? JSON.stringify(version_history) : '{}',
        ats_analysis_results ? JSON.stringify(ats_analysis_results) : '{}',
        req.user.id
      ]
    );

    // Map database 'summary' field to frontend 'professional_summary'
    const data = result.rows[0];
    if (data.summary !== undefined) {
      data.professional_summary = data.summary;
      delete data.summary;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create resume data error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Resume data already exists for this resume' });
    }
    res.status(500).json({ error: 'Failed to create resume data' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const ownershipCheck = await query('SELECT rd.id FROM resume_data rd INNER JOIN resumes r ON r.id = rd.resume_id WHERE rd.id = $1 AND r.created_by = $2', [req.params.id, req.user.id]);
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Resume data not found' });
    }

    const allowedFields = [
      'personal_info',
      'professional_summary',
      'work_experience',
      'education',
      'skills',
      'certifications',
      'projects',
      'languages',
      'job_description',
      'template_id',
      'template_name',
      'template_custom_colors',
      'template_custom_fonts',
      'cover_letter_short',
      'cover_letter_long',
      'ai_metadata',
      'version_history',
      'ats_analysis_results'
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // JSONB fields that should be stringified
        const jsonbFields = ['personal_info', 'work_experience', 'education', 'skills', 'certifications', 'projects', 'languages', 'template_custom_colors', 'template_custom_fonts', 'ai_metadata', 'version_history', 'ats_analysis_results'];

        if (jsonbFields.includes(field) && typeof req.body[field] === 'object' && req.body[field] !== null) {
          updates[field] = JSON.stringify(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const result = await query(`UPDATE resume_data SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`, [...values, req.params.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update resume data error:', error);
    res.status(500).json({ error: 'Failed to update resume data' });
  }
});

export default router;
