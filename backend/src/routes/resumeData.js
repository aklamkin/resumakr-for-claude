import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);
// NOTE: requireSubscription removed - freemium users can access resume data

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

    // Cover letters are a paid feature
    if ((cover_letter_short || cover_letter_long) && req.user.effectiveTier === 'free') {
      return res.status(403).json({
        error: 'Upgrade required',
        message: 'Cover letters require a paid subscription.',
        feature: 'coverLetters',
        upgradeUrl: '/pricing'
      });
    }

    const resumeCheck = await query('SELECT id FROM resumes WHERE id = $1 AND created_by = $2', [resume_id, req.user.id]);
    if (resumeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Explicitly JSON.stringify JSONB fields to ensure valid serialization
    // (AI-generated data can have edge cases the pg driver's auto-serialization doesn't handle)
    const toJson = (val, fallback) => JSON.stringify(val || fallback);

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
        toJson(personal_info, {}),
        professional_summary || '',
        toJson(work_experience, []),
        toJson(education, []),
        toJson(skills, []),
        toJson(certifications, []),
        toJson(projects, []),
        toJson(languages, []),
        job_description || null,
        template_id || null,
        template_name || null,
        toJson(template_custom_colors, {}),
        toJson(template_custom_fonts, {}),
        cover_letter_short || null,
        cover_letter_long || null,
        toJson(ai_metadata, {}),
        toJson(version_history, {}),
        toJson(ats_analysis_results, {}),
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

    // Cover letters are a paid feature
    if ((req.body.cover_letter_short || req.body.cover_letter_long) && req.user.effectiveTier === 'free') {
      return res.status(403).json({
        error: 'Upgrade required',
        message: 'Cover letters require a paid subscription.',
        feature: 'coverLetters',
        upgradeUrl: '/pricing'
      });
    }

    // Fields that free users can update (templates, job description for ATS, ATS results)
    const freeAllowedFields = [
      'job_description',
      'template_id',
      'template_name',
      'template_custom_colors',
      'template_custom_fonts',
      'ats_analysis_results'
    ];

    // All fields that paid users can update
    const allAllowedFields = [
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

    // Check if free user is trying to edit restricted fields
    if (req.user.effectiveTier === 'free') {
      const restrictedFields = ['personal_info', 'professional_summary', 'work_experience', 'education', 'skills', 'certifications', 'projects', 'languages'];
      const attemptedRestrictedFields = restrictedFields.filter(field => req.body[field] !== undefined);

      if (attemptedRestrictedFields.length > 0) {
        return res.status(403).json({
          error: 'Upgrade required',
          message: 'Editing resume data requires a paid subscription.',
          feature: 'editData',
          upgradeUrl: '/pricing'
        });
      }
    }

    const allowedFields = req.user.effectiveTier === 'free' ? freeAllowedFields : allAllowedFields;

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Note: pg driver handles JSONB serialization automatically - don't JSON.stringify
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // JSONB fields need to be stringified for dynamic UPDATE queries
    const jsonbFields = ['personal_info', 'work_experience', 'education', 'skills', 'certifications', 'projects', 'languages', 'template_custom_colors', 'template_custom_fonts', 'ai_metadata', 'version_history', 'ats_analysis_results'];

    const fields = Object.keys(updates);
    const values = fields.map(field => {
      const value = updates[field];
      // Stringify JSONB fields for dynamic UPDATE
      if (jsonbFields.includes(field) && typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    });
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const result = await query(`UPDATE resume_data SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`, [...values, req.params.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update resume data error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update resume data' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ownershipCheck = await query('SELECT rd.id FROM resume_data rd INNER JOIN resumes r ON r.id = rd.resume_id WHERE rd.id = $1 AND r.created_by = $2', [req.params.id, req.user.id]);
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Resume data not found' });
    }

    await query('DELETE FROM resume_data WHERE id = $1', [req.params.id]);
    res.json({ message: 'Resume data deleted successfully' });
  } catch (error) {
    console.error('Delete resume data error:', error);
    res.status(500).json({ error: 'Failed to delete resume data' });
  }
});

export default router;
