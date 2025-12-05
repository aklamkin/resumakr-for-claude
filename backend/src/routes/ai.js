import express from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../config/database.js';
import { authenticate, requireSubscription } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);
router.use(requireSubscription);

async function getActiveProviders() {
  // Get default provider first, then other active providers
  const defaultResult = await query('SELECT * FROM ai_providers WHERE is_active = true AND is_default = true LIMIT 1');
  const othersResult = await query('SELECT * FROM ai_providers WHERE is_active = true AND is_default = false ORDER BY created_at ASC');

  // Return default first, then others
  return [...defaultResult.rows, ...othersResult.rows];
}

export function getAIClient(provider) {
  const apiKey = provider.api_key || provider.config?.api_key;

  if (!apiKey) {
    throw new Error(`${provider.provider_type} API key not configured`);
  }

  // OpenAI-compatible providers (OpenAI, OpenRouter, Groq, Perplexity, etc.)
  const openaiCompatibleProviders = ['openai', 'openrouter', 'groq', 'perplexity', 'deepseek', 'mistral'];

  if (openaiCompatibleProviders.includes(provider.provider_type)) {
    const config = { apiKey };

    // Set custom base URL for non-OpenAI providers
    if (provider.provider_type !== 'openai') {
      // Check for api_url or api_endpoint (both fields are used)
      const apiUrl = provider.api_url || provider.api_endpoint;

      console.log('[AI] Provider:', provider.name, 'Type:', provider.provider_type);
      console.log('[AI] api_url:', provider.api_url);
      console.log('[AI] api_endpoint:', provider.api_endpoint);
      console.log('[AI] Resolved apiUrl:', apiUrl);

      if (apiUrl) {
        // Extract base URL from the full API endpoint
        // Remove /chat/completions if present
        let cleanUrl = apiUrl.replace(/\/chat\/completions\/?$/, '');
        config.baseURL = cleanUrl;
        console.log('[AI] Set baseURL from apiUrl:', config.baseURL);
      } else {
        // Use default base URLs for known providers
        const defaultBaseUrls = {
          'openrouter': 'https://openrouter.ai/api/v1',
          'groq': 'https://api.groq.com/openai/v1',
          'perplexity': 'https://api.perplexity.ai',
          'deepseek': 'https://api.deepseek.com/v1',
          'mistral': 'https://api.mistral.ai/v1'
        };
        if (defaultBaseUrls[provider.provider_type]) {
          config.baseURL = defaultBaseUrls[provider.provider_type];
          console.log('[AI] Set baseURL from defaults:', config.baseURL);
        } else {
          console.log('[AI] No default baseURL found for provider type:', provider.provider_type);
        }
      }
    }

    console.log('[AI] Final OpenAI config:', { baseURL: config.baseURL, hasApiKey: !!config.apiKey });
    return { type: 'openai', client: new OpenAI(config) };
  } else if (provider.provider_type === 'gemini') {
    return { type: 'gemini', client: new GoogleGenerativeAI(apiKey) };
  }

  throw new Error(`Provider type ${provider.provider_type} not supported`);
}

export async function callAI(aiClientWrapper, prompt, systemPrompt, modelName, options = {}) {
  const { type, client } = aiClientWrapper;

  if (type === 'openai') {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const completion = await client.chat.completions.create({
      model: modelName,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2000
    });

    return {
      content: completion.choices[0].message.content,
      usage: completion.usage
    };
  } else if (type === 'gemini') {
    const model = client.getGenerativeModel({ model: modelName });

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.max_tokens ?? 2000
      }
    });

    const response = result.response;
    return {
      content: response.text(),
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: response.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  throw new Error(`Unsupported AI client type: ${type}`);
}

router.post('/invoke', async (req, res) => {
  try {
    const { prompt, response_json_schema, provider_id, model } = req.body;
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
      // Get the default provider explicitly
      const defaultProviders = await query('SELECT * FROM ai_providers WHERE is_active = true AND is_default = true LIMIT 1');
      if (defaultProviders.rows.length > 0) {
        provider = defaultProviders.rows[0];
      } else {
        // Fallback to first active provider if no default set
        const providers = await getActiveProviders();
        if (providers.length === 0) {
          return res.status(503).json({ error: 'No active AI providers configured' });
        }
        provider = providers[0];
      }
    }
    // Use the callAI helper which supports both OpenAI and Gemini providers
    const aiClientWrapper = getAIClient(provider);
    const systemPrompt = provider.custom_prompt || 'You are a helpful AI assistant for resume writing.';
    let userPrompt = prompt;

    // Add JSON schema instruction if needed
    if (response_json_schema) {
      userPrompt += '\n\nRespond ONLY with valid JSON matching this schema:\n' + JSON.stringify(response_json_schema, null, 2);
    }

    // Use model from: request body > provider config > default
    const modelToUse = model || provider.model_name || 'gpt-4o-mini';

    const aiResponse = await callAI(aiClientWrapper, userPrompt, systemPrompt, modelToUse, {
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = aiResponse.content;
    let result = content;

    // Parse JSON if schema was provided
    if (response_json_schema) {
      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleaned);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        result = { error: 'Failed to parse AI response', raw: content };
      }
    }

    res.json({ result: result, provider: provider.name, model: model, usage: aiResponse.usage });
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
        // Use callAI helper which supports both OpenAI and Gemini providers
        const aiClientWrapper = getAIClient(provider);
        const systemPrompt = 'You are an expert resume writer.';
        const modelToUse = provider.model_name || 'gpt-4o-mini';
        const aiResponse = await callAI(aiClientWrapper, prompt, systemPrompt, modelToUse, {
          temperature: 0.7,
          max_tokens: 500
        });
        results.push({
          provider_id: provider.id,
          provider_name: provider.name,
          improved_text: aiResponse.content.trim()
        });
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

    // Get the default provider explicitly
    const defaultProviders = await query('SELECT * FROM ai_providers WHERE is_active = true AND is_default = true LIMIT 1');
    let provider;
    if (defaultProviders.rows.length > 0) {
      provider = defaultProviders.rows[0];
    } else {
      // Fallback to first active provider if no default set
      const providers = await getActiveProviders();
      if (providers.length === 0) {
        return res.status(503).json({ error: 'No active AI providers configured' });
      }
      provider = providers[0];
    }
    // Use callAI helper which supports both OpenAI and Gemini providers
    const aiClientWrapper = getAIClient(provider);
    const systemPrompt = 'You are an expert ATS system analyst.';
    const modelToUse = provider.model_name || 'gpt-4o-mini';
    const aiResponse = await callAI(aiClientWrapper, prompt, systemPrompt, modelToUse, {
      temperature: 0.3,
      max_tokens: 1500
    });

    const content = aiResponse.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);
    res.json({
      ...analysis,
      analyzed_at: new Date().toISOString(),
      analyzed_job_description: job_description,
      analyzed_resume_snapshot: resume_data
    });
  } catch (error) {
    console.error('ATS analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

export default router;
