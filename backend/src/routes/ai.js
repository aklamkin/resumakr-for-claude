import express from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getUserAiCredits, deductAiCredit } from '../utils/usageTracking.js';
import { buildPrompt, buildAtsInstructions, buildResumeSummary } from '../utils/promptLoader.js';

const router = express.Router();
router.use(authenticate);

/**
 * Repair common JSON issues from AI-generated responses
 */
function repairJSON(jsonString) {
  let repaired = jsonString;
  // Remove trailing commas before closing brackets/braces
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  // Remove markdown code block markers
  repaired = repaired.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  return repaired.trim();
}

/**
 * Attempt to close a truncated JSON string by balancing braces/brackets
 */
function closeTruncatedJSON(jsonString) {
  let s = jsonString;
  // Remove any trailing incomplete string value (unmatched quote)
  const lastQuote = s.lastIndexOf('"');
  const afterLastQuote = s.substring(lastQuote + 1).trim();
  // If the content after the last quote doesn't start with a structural char, the string was mid-value
  if (lastQuote > 0 && !/^[,:\]}\[]/.test(afterLastQuote)) {
    s = s.substring(0, lastQuote + 1);
  }
  // Remove trailing comma
  s = s.replace(/,\s*$/, '');
  // Count unbalanced braces and brackets
  let braces = 0, brackets = 0;
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && (i === 0 || s[i - 1] !== '\\')) {
      inString = !inString;
    } else if (!inString) {
      if (c === '{') braces++;
      else if (c === '}') braces--;
      else if (c === '[') brackets++;
      else if (c === ']') brackets--;
    }
  }
  // Close any open brackets then braces
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }
  return s;
}
// NOTE: requireSubscription removed - freemium users can access AI with credit limits

/**
 * Middleware to check AI credits for free users (account-level, not per-resume)
 */
async function checkAiCredits(req, res, next) {
  // Paid users have unlimited credits
  if (req.user.effectiveTier === 'paid') {
    return next();
  }

  // Check account-level credits
  const credits = await getUserAiCredits(req.user.id);

  if (credits.remaining <= 0) {
    return res.status(403).json({
      error: 'AI credits exhausted',
      message: `You've used all ${credits.total} AI credits on your free account. Upgrade for unlimited AI assistance.`,
      creditsUsed: credits.used,
      creditsTotal: credits.total,
      creditsRemaining: 0,
      upgradeUrl: '/pricing'
    });
  }

  req.aiCredits = credits;
  next();
}

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
      usage: completion.usage,
      finishReason: completion.choices[0].finish_reason
    };
  } else if (type === 'gemini') {
    const model = client.getGenerativeModel({
      model: modelName,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE'
        }
      ]
    });

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.max_tokens ?? 2000
      }
    });

    const response = result.response;

    // Log finish reason and safety ratings for debugging
    const candidate = response.candidates?.[0];
    if (candidate) {
      console.log('[GEMINI] Finish reason:', candidate.finishReason);
      if (candidate.safetyRatings) {
        console.log('[GEMINI] Safety ratings:', JSON.stringify(candidate.safetyRatings));
      }
    }

    return {
      content: response.text(),
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: response.usageMetadata?.totalTokenCount || 0
      },
      finishReason: candidate?.finishReason || 'STOP'
    };
  }

  throw new Error(`Unsupported AI client type: ${type}`);
}

router.post('/invoke', checkAiCredits, async (req, res) => {
  try {
    const { prompt, response_json_schema, provider_id, model, max_tokens, temperature, resumeId } = req.body;
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
      temperature: temperature ?? 0.3,  // Lower temp for faster, more consistent responses
      max_tokens: max_tokens ?? 800     // Reduced from 2000 for faster responses
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

    // Deduct credit from user's ACCOUNT (free users only)
    let updatedCredits = null;
    if (req.user.effectiveTier === 'free') {
      updatedCredits = await deductAiCredit(req.user.id, resumeId || null, 'invoke', 1);
    }

    res.json({
      result: result,
      provider: provider.name,
      model: model,
      usage: aiResponse.usage,
      credits: updatedCredits ? {
        used: updatedCredits.used,
        total: updatedCredits.total,
        remaining: updatedCredits.remaining
      } : null // null for paid users (unlimited)
    });
  } catch (error) {
    console.error('AI invoke error:', error);
    res.status(500).json({ error: 'AI request failed', message: error.message });
  }
});

router.post('/improve-summary', checkAiCredits, async (req, res) => {
  try {
    const { current_summary, job_description, resumeId } = req.body;
    const promptData = await buildPrompt('improve_summary_dedicated', {
      current_summary: current_summary || '',
      job_description: job_description || 'Not provided'
    });
    const prompt = promptData.userPrompt;
    const providers = await getActiveProviders();
    const results = [];
    for (const provider of providers) {
      try {
        // Use callAI helper which supports both OpenAI and Gemini providers
        const aiClientWrapper = getAIClient(provider);
        const systemPrompt = promptData.systemPrompt;
        const modelToUse = provider.model_name || 'gpt-4o-mini';
        const aiResponse = await callAI(aiClientWrapper, prompt, systemPrompt, modelToUse, {
          temperature: promptData.temperature ?? 0.7,
          max_tokens: promptData.max_tokens ?? 500
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

    // Deduct credit from user's ACCOUNT (free users only)
    let updatedCredits = null;
    if (req.user.effectiveTier === 'free') {
      updatedCredits = await deductAiCredit(req.user.id, resumeId || null, 'improve_summary', 1);
    }

    res.json({
      versions: results,
      credits: updatedCredits ? {
        used: updatedCredits.used,
        total: updatedCredits.total,
        remaining: updatedCredits.remaining
      } : null
    });
  } catch (error) {
    console.error('Improve summary error:', error);
    res.status(500).json({ error: 'Failed to improve summary' });
  }
});

router.post('/analyze-ats', checkAiCredits, async (req, res) => {
  try {
    const { job_description, resume_data, resumeId } = req.body;
    if (!job_description || !resume_data) {
      return res.status(400).json({ error: 'Job description and resume data required' });
    }

    const isFreeUser = req.user.effectiveTier === 'free';
    const resumeText = `Professional Summary: ${resume_data.professional_summary || ''}\n\nWork Experience:\n${resume_data.work_experience?.map(job => `${job.position} at ${job.company}\n${job.responsibilities?.join('\n')}`).join('\n') || ''}\n\nSkills: ${resume_data.skills?.flatMap(s => s.items).join(', ') || ''}`.trim();

    const promptType = isFreeUser ? 'ats_analysis_free' : 'ats_analysis_paid';
    const promptData = await buildPrompt(promptType, {
      job_description,
      resume_text: resumeText
    });
    const prompt = promptData.userPrompt;

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
    const systemPrompt = promptData.systemPrompt;
    const modelToUse = provider.model_name || 'gpt-4o-mini';

    // Use fewer tokens for free users (score only)
    const maxTokens = promptData.max_tokens ?? (isFreeUser ? 200 : 8000);

    const aiResponse = await callAI(aiClientWrapper, prompt, systemPrompt, modelToUse, {
      temperature: promptData.temperature ?? 0.3,
      max_tokens: maxTokens
    });

    const content = aiResponse.content;
    let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Repair truncated or malformed JSON from AI response
    cleaned = repairJSON(cleaned);

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      // If finish reason indicates truncation, try harder to salvage
      const reason = aiResponse.finishReason;
      console.warn(`ATS JSON parse failed (finishReason: ${reason}):`, parseError.message);

      if (reason === 'MAX_TOKENS' || reason === 'length') {
        // Try to close the truncated JSON structure
        const salvaged = closeTruncatedJSON(cleaned);
        try {
          analysis = JSON.parse(salvaged);
        } catch {
          // Last resort: extract just the score
          const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/);
          analysis = {
            score: scoreMatch ? parseInt(scoreMatch[1], 10) : 0,
            recommendations: ['Analysis was truncated. Please try again.'],
            keywords_extracted_jd: [],
            keywords_found_resume: [],
            missing_keywords: []
          };
        }
      } else {
        throw parseError;
      }
    }

    // Deduct credit from user's ACCOUNT (free users only)
    let updatedCredits = null;
    if (isFreeUser) {
      updatedCredits = await deductAiCredit(req.user.id, resumeId || null, 'analyze_ats', 1);
    }

    // Build response based on tier
    let response;
    if (isFreeUser) {
      response = {
        score: analysis.score,
        message: 'Upgrade to see detailed insights, missing keywords, and recommendations.',
        // Provide null values so frontend knows these fields exist but are locked
        keywords_extracted_jd: null,
        keywords_found_resume: null,
        missing_keywords: null,
        recommendations: null,
        tier: 'free',
        upgradeUrl: '/pricing'
      };
    } else {
      response = {
        ...analysis,
        tier: 'paid'
      };
    }

    res.json({
      ...response,
      analyzed_at: new Date().toISOString(),
      analyzed_job_description: job_description,
      analyzed_resume_snapshot: resume_data,
      credits: updatedCredits ? {
        used: updatedCredits.used,
        total: updatedCredits.total,
        remaining: updatedCredits.remaining
      } : null
    });
  } catch (error) {
    console.error('ATS analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

router.post('/improve-section', checkAiCredits, async (req, res) => {
  try {
    const { section_type, section_content, missing_keywords, resumeId } = req.body;
    if (!section_type || !section_content) {
      return res.status(400).json({ error: 'section_type and section_content are required' });
    }

    // Map section_type to prompt_type
    const promptTypeMap = { bullets: 'improve_bullets', summary: 'improve_summary', skills: 'improve_skills' };
    const promptType = promptTypeMap[section_type];
    if (!promptType) {
      return res.status(400).json({ error: `Invalid section_type: ${section_type}. Must be one of: bullets, summary, skills` });
    }

    const atsInstructions = buildAtsInstructions(missing_keywords);
    const promptData = await buildPrompt(promptType, {
      section_content,
      missing_keywords: Array.isArray(missing_keywords) ? missing_keywords.join(', ') : (missing_keywords || ''),
      ats_instructions: atsInstructions
    });

    // Get default provider
    const defaultProviders = await query('SELECT * FROM ai_providers WHERE is_active = true AND is_default = true LIMIT 1');
    let provider;
    if (defaultProviders.rows.length > 0) {
      provider = defaultProviders.rows[0];
    } else {
      const providers = await getActiveProviders();
      if (providers.length === 0) {
        return res.status(503).json({ error: 'No active AI providers configured' });
      }
      provider = providers[0];
    }

    const aiClientWrapper = getAIClient(provider);
    const modelToUse = provider.model_name || 'gpt-4o-mini';
    const aiResponse = await callAI(aiClientWrapper, promptData.userPrompt, promptData.systemPrompt, modelToUse, {
      temperature: promptData.temperature ?? 0.3,
      max_tokens: promptData.max_tokens ?? 500
    });

    // Deduct credit for free users
    let updatedCredits = null;
    if (req.user.effectiveTier === 'free') {
      updatedCredits = await deductAiCredit(req.user.id, resumeId || null, `improve_${section_type}`, 1);
    }

    res.json({
      result: aiResponse.content.trim(),
      provider: provider.name,
      model: modelToUse,
      usage: aiResponse.usage,
      credits: updatedCredits ? {
        used: updatedCredits.used,
        total: updatedCredits.total,
        remaining: updatedCredits.remaining
      } : null
    });
  } catch (error) {
    console.error('Improve section error:', error);
    res.status(500).json({ error: 'Failed to improve section', message: error.message });
  }
});

router.post('/generate-cover-letter', checkAiCredits, async (req, res) => {
  try {
    const { version_type, resume_data, job_description, resumeId } = req.body;
    if (!version_type || !resume_data) {
      return res.status(400).json({ error: 'version_type and resume_data are required' });
    }
    if (version_type !== 'short' && version_type !== 'long') {
      return res.status(400).json({ error: 'version_type must be "short" or "long"' });
    }

    const promptType = `cover_letter_${version_type}`;
    const resumeSummary = buildResumeSummary(resume_data);
    const jobDescSection = job_description ? `Job Description:\n${job_description}\n` : '';

    const promptData = await buildPrompt(promptType, {
      resume_summary: resumeSummary,
      job_description: job_description || '',
      job_description_section: jobDescSection
    });

    // Get default provider
    const defaultProviders = await query('SELECT * FROM ai_providers WHERE is_active = true AND is_default = true LIMIT 1');
    let provider;
    if (defaultProviders.rows.length > 0) {
      provider = defaultProviders.rows[0];
    } else {
      const providers = await getActiveProviders();
      if (providers.length === 0) {
        return res.status(503).json({ error: 'No active AI providers configured' });
      }
      provider = providers[0];
    }

    const aiClientWrapper = getAIClient(provider);
    const modelToUse = provider.model_name || 'gpt-4o-mini';
    const aiResponse = await callAI(aiClientWrapper, promptData.userPrompt, promptData.systemPrompt, modelToUse, {
      temperature: promptData.temperature ?? 0.7,
      max_tokens: promptData.max_tokens ?? 2000
    });

    // Deduct credit for free users
    let updatedCredits = null;
    if (req.user.effectiveTier === 'free') {
      updatedCredits = await deductAiCredit(req.user.id, resumeId || null, `cover_letter_${version_type}`, 1);
    }

    res.json({
      result: aiResponse.content.trim(),
      provider: provider.name,
      model: modelToUse,
      usage: aiResponse.usage,
      credits: updatedCredits ? {
        used: updatedCredits.used,
        total: updatedCredits.total,
        remaining: updatedCredits.remaining
      } : null
    });
  } catch (error) {
    console.error('Generate cover letter error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter', message: error.message });
  }
});

export default router;
