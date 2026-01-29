import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { query } from '../config/database.js';
import { authenticate, requireFeature } from '../middleware/auth.js';
import { getAIClient, callAI } from './ai.js';
import { buildPrompt } from '../utils/promptLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

router.use(authenticate);

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ file_url: fileUrl, original_name: req.file.originalname, size: req.file.size, mime_type: req.file.mimetype });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileBuffer = await fs.readFile(filePath);
  if (ext === '.pdf') {
    const data = await pdfParse(fileBuffer);
    return data.text;
  } else if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  }
  throw new Error('Unsupported file format');
}

function repairJSON(jsonString) {
  let repaired = jsonString;

  // Remove any trailing commas before closing brackets/braces
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // Remove any markdown code block markers
  repaired = repaired.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  return repaired.trim();
}

// Post-processing validation and cleanup functions
function normalizeDate(dateStr) {
  if (!dateStr || dateStr.toLowerCase() === 'present') return '';

  // Try to parse various date formats to YYYY-MM
  try {
    // Handle "Month Year" format (e.g., "January 2020", "Jan 2020")
    const monthYearMatch = dateStr.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthYearMatch) {
      const monthMap = {
        'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
        'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
        'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
        'august': '08', 'aug': '08', 'september': '09', 'sep': '09', 'sept': '09',
        'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
        'december': '12', 'dec': '12'
      };
      const month = monthMap[monthYearMatch[1].toLowerCase()];
      if (month) {
        return `${monthYearMatch[2]}-${month}`;
      }
    }

    // Handle "YYYY-MM-DD" format - extract YYYY-MM
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}`;
    }

    // Already in YYYY-MM format
    const yyyymmMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
    if (yyyymmMatch) {
      return dateStr;
    }

    // Handle "MM/YYYY" or "MM-YYYY" format
    const mmyyyyMatch = dateStr.match(/^(\d{1,2})[\/-](\d{4})$/);
    if (mmyyyyMatch) {
      const month = mmyyyyMatch[1].padStart(2, '0');
      return `${mmyyyyMatch[2]}-${month}`;
    }

    // Handle just year "YYYY" - preserve as year-only, don't add default month
    const yearMatch = dateStr.match(/^(\d{4})$/);
    if (yearMatch) {
      return yearMatch[1]; // Return just the year, no fake month
    }

    return dateStr; // Return as-is if can't parse
  } catch (error) {
    console.error('[EXTRACT] Date normalization error:', error);
    return dateStr;
  }
}

function cleanAndValidateData(extractedData) {
  console.log('[EXTRACT] Cleaning and validating extracted data...');

  const cleaned = { ...extractedData };

  // Clean personal info
  if (cleaned.personal_info) {
    Object.keys(cleaned.personal_info).forEach(key => {
      if (cleaned.personal_info[key]) {
        cleaned.personal_info[key] = cleaned.personal_info[key].trim();
      }
    });
  }

  // Clean professional summary
  if (cleaned.professional_summary) {
    cleaned.professional_summary = cleaned.professional_summary.trim();
  }

  // Clean and normalize work experience
  if (cleaned.work_experience && Array.isArray(cleaned.work_experience)) {
    cleaned.work_experience = cleaned.work_experience.map(exp => ({
      ...exp,
      company: exp.company?.trim() || '',
      position: exp.position?.trim() || '',
      location: exp.location?.trim() || '',
      start_date: normalizeDate(exp.start_date),
      end_date: exp.current ? '' : normalizeDate(exp.end_date),
      current: Boolean(exp.current),
      responsibilities: Array.isArray(exp.responsibilities)
        ? exp.responsibilities
            .filter(r => r && r.trim())
            .map(r => r.trim())
            // Remove bullet point characters if present
            .map(r => r.replace(/^[•\-\*]\s*/, ''))
        : []
    })).filter(exp => exp.company || exp.position); // Keep only if has company or position
  }

  // Clean education
  if (cleaned.education && Array.isArray(cleaned.education)) {
    cleaned.education = cleaned.education.map(edu => ({
      ...edu,
      institution: edu.institution?.trim() || '',
      degree: edu.degree?.trim() || '',
      field_of_study: edu.field_of_study?.trim() || '',
      location: edu.location?.trim() || '',
      graduation_date: normalizeDate(edu.graduation_date),
      gpa: edu.gpa?.trim() || '',
      honors: edu.honors?.trim() || ''
    })).filter(edu => edu.institution || edu.degree); // Keep only if has institution or degree
  }

  // Clean skills
  if (cleaned.skills && Array.isArray(cleaned.skills)) {
    cleaned.skills = cleaned.skills.map(skillGroup => ({
      category: skillGroup.category?.trim() || 'Skills',
      items: Array.isArray(skillGroup.items)
        ? skillGroup.items
            .filter(item => item && item.trim())
            .map(item => item.trim())
            // Remove duplicates within same category
            .filter((item, index, self) => self.indexOf(item) === index)
        : []
    })).filter(skillGroup => skillGroup.items.length > 0); // Keep only if has items
  }

  // Clean certifications
  if (cleaned.certifications && Array.isArray(cleaned.certifications)) {
    cleaned.certifications = cleaned.certifications.map(cert => ({
      ...cert,
      name: cert.name?.trim() || '',
      issuer: cert.issuer?.trim() || '',
      date_obtained: cert.date_obtained?.trim() || '',
      expiry_date: cert.expiry_date?.trim() || '',
      credential_id: cert.credential_id?.trim() || ''
    })).filter(cert => cert.name); // Keep only if has name
  }

  // Clean projects
  if (cleaned.projects && Array.isArray(cleaned.projects)) {
    cleaned.projects = cleaned.projects.map(proj => ({
      ...proj,
      name: proj.name?.trim() || '',
      description: proj.description?.trim() || '',
      technologies: Array.isArray(proj.technologies)
        ? proj.technologies.filter(t => t && t.trim()).map(t => t.trim())
        : [],
      url: proj.url?.trim() || ''
    })).filter(proj => proj.name); // Keep only if has name
  }

  // Clean languages
  if (cleaned.languages && Array.isArray(cleaned.languages)) {
    cleaned.languages = cleaned.languages.map(lang => ({
      language: lang.language?.trim() || '',
      proficiency: lang.proficiency?.trim() || ''
    })).filter(lang => lang.language); // Keep only if has language
  }

  console.log('[EXTRACT] Data cleaning complete');
  return cleaned;
}

// Resume parsing (AI extraction) is a paid feature
router.post('/extract', requireFeature('resumeParsing'), async (req, res) => {
  try {
    const { file_url } = req.body;
    if (!file_url) {
      return res.status(400).json({ error: 'file_url is required' });
    }

    const filename = path.basename(file_url);
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
    const filePath = path.join(uploadDir, filename);

    // Extract text from file
    console.log('[EXTRACT] Starting extraction for:', filename);
    let extractedText;
    try {
      extractedText = await extractTextFromFile(filePath);
      console.log('[EXTRACT] Text extracted successfully, length:', extractedText.length, 'characters');
    } catch (extractError) {
      console.error('[EXTRACT] Text extraction error:', extractError);
      return res.status(500).json({
        error: 'Failed to extract text from file',
        message: extractError.message,
        details: 'Unable to parse the uploaded file. Please ensure it is a valid PDF or DOCX document.'
      });
    }

    // Get the default AI provider (explicitly check for is_default=true first)
    let providers = await query('SELECT * FROM ai_providers WHERE is_active = true AND is_default = true LIMIT 1');

    // If no default provider, fall back to any active provider
    if (providers.rows.length === 0) {
      console.log('[EXTRACT] No default provider set, falling back to first active provider');
      providers = await query('SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at ASC LIMIT 1');
    }

    if (providers.rows.length === 0) {
      console.error('[EXTRACT] No active AI providers configured');
      return res.status(503).json({
        error: 'AI Provider Not Configured',
        message: 'Resume parsing requires an AI provider to be configured. Please ask an administrator to set up an AI provider (OpenAI, Gemini, etc.) in Admin Settings > AI Providers.',
        action_required: 'Configure AI Provider',
        admin_path: '/settingsproviders'
      });
    }
    const provider = providers.rows[0];
    console.log('[EXTRACT] Using provider:', provider.name, 'type:', provider.provider_type, 'is_default:', provider.is_default);

    // Get AI client for the configured provider
    let aiClient;
    try {
      aiClient = getAIClient(provider);
    } catch (clientError) {
      console.error('[EXTRACT] Failed to initialize AI client:', clientError);
      return res.status(503).json({
        error: 'AI Provider Configuration Error',
        message: clientError.message
      });
    }

    // Load prompt from database (admin-configurable)
    const { systemPrompt, userPrompt: prompt } = await buildPrompt('resume_parsing', { resume_text: extractedText });

    // Determine models to try based on provider type
    let modelsToTry = [];
    if (provider.provider_type === 'openai') {
      // Use configured model_name if available, otherwise use defaults
      if (provider.model_name) {
        modelsToTry = [provider.model_name];
      } else {
        modelsToTry = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
      }
    } else if (provider.provider_type === 'openrouter') {
      // Use configured model_name if available, otherwise use defaults
      if (provider.model_name) {
        modelsToTry = [provider.model_name];
      } else {
        // OpenRouter uses provider/model format
        modelsToTry = ['openai/gpt-4o', 'openai/gpt-4-turbo', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct'];
      }
    } else if (provider.provider_type === 'groq') {
      if (provider.model_name) {
        modelsToTry = [provider.model_name];
      } else {
        modelsToTry = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'];
      }
    } else if (provider.provider_type === 'perplexity') {
      if (provider.model_name) {
        modelsToTry = [provider.model_name];
      } else {
        modelsToTry = ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'];
      }
    } else if (provider.provider_type === 'gemini') {
      if (provider.model_name) {
        modelsToTry = [provider.model_name];
      } else {
        // Use only experimental flash model that's available in free tier
        modelsToTry = ['gemini-2.0-flash-exp'];
      }
    } else {
      modelsToTry = [provider.model_name || 'gpt-4'];
    }

    // Try models with fallback
    let aiResponse;
    let usedModel;
    let lastError;

    for (const model of modelsToTry) {
      try {
        console.log('[EXTRACT] Attempting to use model:', model);
        aiResponse = await callAI(aiClient, prompt, systemPrompt, model, {
          temperature: 0,
          max_tokens: 8000
        });
        usedModel = model;
        console.log('[EXTRACT] Successfully used model:', model, '- Response length:', aiResponse.content.length);
        break;
      } catch (modelError) {
        console.error(`[EXTRACT] Model ${model} failed:`, modelError.message);
        lastError = modelError;

        // If it's an authentication error, don't try other models
        if (modelError.status === 401 || modelError.message?.includes('API key') || modelError.message?.includes('authentication')) {
          console.error('[EXTRACT] Authentication error detected, stopping model fallback');
          throw new Error(`Invalid API key for provider ${provider.name}. Please check your AI provider configuration.`);
        }

        // If it's the last model, throw the error
        if (model === modelsToTry[modelsToTry.length - 1]) {
          console.error('[EXTRACT] All models failed');
          throw new Error(`All models failed. Last error: ${modelError.message}`);
        }

        // Otherwise continue to next model
        console.log('[EXTRACT] Trying next model...');
        continue;
      }
    }

    if (!aiResponse) {
      throw lastError || new Error('Failed to get response from AI provider');
    }

    // Clean and parse the response
    console.log('[EXTRACT] Cleaning and parsing response...');
    let cleaned = aiResponse.content.trim();
    cleaned = repairJSON(cleaned);

    let extractedData;
    try {
      extractedData = JSON.parse(cleaned);
      console.log('[EXTRACT] JSON parsed successfully');

      // Apply post-processing validation and cleanup
      extractedData = cleanAndValidateData(extractedData);
      console.log('[EXTRACT] Data validated and cleaned');
    } catch (parseError) {
      console.error('[EXTRACT] JSON parse error:', parseError.message);

      // Try to extract position for better debugging
      const pos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
      if (pos > 0) {
        const context = cleaned.substring(Math.max(0, pos - 100), Math.min(cleaned.length, pos + 100));
        console.error('[EXTRACT] Error context:', context);
      }

      // Log first 1000 chars for debugging
      console.error('[EXTRACT] Response preview:', cleaned.substring(0, 1000));

      return res.status(500).json({
        error: 'AI returned invalid JSON',
        message: 'The AI provider generated malformed JSON. Please try again.',
        details: parseError.message,
        debug_preview: process.env.NODE_ENV === 'development' ? cleaned.substring(0, 500) : undefined
      });
    }

    // Return response in format expected by frontend
    const responseData = {
      status: 'success',
      output: extractedData,
      data: extractedData,
      raw_text: extractedText.substring(0, 5000), // First 5000 chars
      extraction_method: 'ai',
      provider: provider.name,
      provider_type: provider.provider_type,
      model_used: usedModel
    };

    console.log('[EXTRACT] Extraction completed successfully');
    res.json(responseData);
  } catch (error) {
    console.error('[EXTRACT] Fatal error:', error);
    console.error('[EXTRACT] Error stack:', error.stack);

    // Provide specific error messages
    let errorMessage = 'Failed to extract data from file';
    let errorDetails = error.message;

    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      errorMessage = 'AI Provider Configuration Error';
      errorDetails = 'The configured API key appears to be invalid. Please check your AI provider settings in Admin Settings > AI Providers.';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      errorMessage = 'Rate Limit Exceeded';
      errorDetails = 'The AI provider rate limit has been exceeded. Please try again in a few moments.';
    } else if (error.status === 500 || error.status === 503) {
      errorMessage = 'AI Provider Error';
      errorDetails = 'The AI provider encountered an error. Please try again.';
    }

    res.status(500).json({
      error: errorMessage,
      message: errorDetails,
      technical_details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
