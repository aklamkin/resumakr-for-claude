import express from 'express';
import OpenAI from 'openai';
import { query } from '../config/database.js';
import { authenticate, requireSubscription } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSubscription);

async function getActiveProviders() {
  const result = await query('SELECT * FROM ai_providers WHERE is_active = true ORDER BY is_default DESC');
  return result.rows;
}

function getAIClient(provider) {
  if (provider.provider_type === 'openai') {
    return new OpenAI({ apiKey: provider.api_key });
  }
  throw new Error(`Provider type ${provider.provider_type} not supported`);
}

router.post('/invoke', async (req, res) => {
  try {
    const { prompt, response_json_schema, provider_id, model = 'gpt-4' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    let provider;
    if (provider_id) {
      const result = await query('SELECT * FROM ai_providers WHERE id = $1 AND is_active = true', [provider_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Provider not found' });
      }
      provider = result.rows[0];
    } else {
      const providers = await getActiveProviders();
      if (providers.length === 0) {
        return res.status(503).json({ error: 'No active AI providers configured' });
      }
      provider = providers[0];
    }
    const client = getAIClient(provider);
    const messages = [{ role: 'system', content: provider.custom_prompt || 'You are a helpful AI assistant for resume writing.' }, { role: 'user', content: prompt }];
    if (response_json_schema) {
      messages[1].content += '\n\nRespond ONLY with valid JSON matching this schema:\n' + JSON.stringify(response_json_schema, null, 2);
    }
    const completion = await client.chat.completions.create({ model: model, messages: messages, temperature: 0.7, max_tokens: 2000 });
    const content = completion.choices[0].message.content;
    let result = content;
    if (response_json_schema) {
      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleaned);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        result = { error: 'Failed to parse AI response', raw: content };
      }
    }
    res.json({ result: result, provider: provider.name, model: model, usage: completion.usage });
  } catch (error) {
    console.error('AI invoke error:', error);
    res.status(500).json({ error: 'AI request failed', message: error.message });
  }
});

router.post('/improve-summary', async (req, res) => {
  try {
    const { current_summary, job_description } = req.body;
    const prompt = `You are an expert resume writer. Improve the following professional summary to be more impactful and ATS-friendly.\n\nCurrent Summary:\n${current_summary}\n\nJob Description: ${job_description || 'Not provided'}\n\nRequirements: Keep 3-4 sentences, use action verbs, include keywords. Return ONLY the improved summary.`.trim();
    const providers = await getActiveProviders();
    const results = [];
    for (const provider of providers) {
      try {
        const client = getAIClient(provider);
        const completion = await client.chat.completions.create({ model: 'gpt-4', messages: [{ role: 'system', content: 'You are an expert resume writer.' }, { role: 'user', content: prompt }], temperature: 0.7, max_tokens: 500 });
        results.push({ provider_id: provider.id, provider_name: provider.name, improved_text: completion.choices[0].message.content.trim() });
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error);
      }
    }
    res.json({ versions: results });
  } catch (error) {
    console.error('Improve summary error:', error);
    res.status(500).json({ error: 'Failed to improve summary' });
  }
});

router.post('/analyze-ats', async (req, res) => {
  try {
    const { job_description, resume_data } = req.body;
    if (!job_description || !resume_data) {
      return res.status(400).json({ error: 'Job description and resume data required' });
    }
    const resumeText = `Professional Summary: ${resume_data.professional_summary || ''}\n\nWork Experience:\n${resume_data.work_experience?.map(job => `${job.position} at ${job.company}\n${job.responsibilities?.join('\n')}`).join('\n') || ''}\n\nSkills: ${resume_data.skills?.flatMap(s => s.items).join(', ') || ''}`.trim();
    const prompt = `Analyze this resume against the job description for ATS compatibility.\n\nJob Description:\n${job_description}\n\nResume:\n${resumeText}\n\nProvide JSON: {"score": <0-100>, "keywords_extracted_jd": [...], "keywords_found_resume": [...], "missing_keywords": [...], "recommendations": [...]}`.trim();
    const providers = await getActiveProviders();
    const provider = providers[0];
    if (!provider) {
      return res.status(503).json({ error: 'No active AI providers configured' });
    }
    const client = getAIClient(provider);
    const completion = await client.chat.completions.create({ model: 'gpt-4', messages: [{ role: 'system', content: 'You are an expert ATS system analyst.' }, { role: 'user', content: prompt }], temperature: 0.3, max_tokens: 1500 });
    const content = completion.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);
    res.json({ ...analysis, analyzed_at: new Date().toISOString(), analyzed_job_description: job_description, analyzed_resume_snapshot: resume_data });
  } catch (error) {
    console.error('ATS analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

export default router;
