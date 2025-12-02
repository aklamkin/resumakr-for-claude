import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getAIClient, callAI } from './ai.js';

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

router.post('/extract', async (req, res) => {
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

    // Get the default AI provider
    const providers = await query('SELECT * FROM ai_providers WHERE is_active = true ORDER BY is_default DESC LIMIT 1');
    if (providers.rows.length === 0) {
      console.error('[EXTRACT] No active AI providers configured');
      return res.status(503).json({ error: 'No active AI providers configured' });
    }
    const provider = providers.rows[0];
    console.log('[EXTRACT] Using provider:', provider.name, 'type:', provider.provider_type);

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

    // Enhanced prompt for better JSON generation
    const prompt = `You are extracting resume data. Return ONLY valid JSON, no other text.

Resume Text:
${extractedText}

Return this exact JSON structure with all fields filled:
{
  "personal_info": {"full_name": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "", "github": ""},
  "professional_summary": "",
  "work_experience": [{"company": "", "position": "", "location": "", "start_date": "YYYY-MM", "end_date": "YYYY-MM", "current": false, "responsibilities": [""]}],
  "education": [{"institution": "", "degree": "", "field_of_study": "", "location": "", "graduation_date": "YYYY-MM", "gpa": "", "honors": ""}],
  "skills": [{"category": "Technical Skills", "items": [""]}],
  "certifications": [{"name": "", "issuer": "", "date_obtained": "", "expiry_date": "", "credential_id": ""}],
  "projects": [{"name": "", "description": "", "technologies": [""], "url": ""}],
  "languages": [{"language": "", "proficiency": ""}]
}

CRITICAL:
- Return ONLY the JSON object, no markdown, no code blocks, no explanations
- Ensure all strings are properly escaped
- Use empty strings for missing data, not null
- Ensure all arrays have commas between elements
- The JSON must be valid and parseable`.trim();

    const systemPrompt = 'You are a JSON-only output system. Return ONLY valid, parseable JSON with no markdown, no code blocks, no explanations. Every field must be filled with either extracted data or an empty string/array.';

    // Determine models to try based on provider type
    let modelsToTry = [];
    if (provider.provider_type === 'openai') {
      modelsToTry = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
    } else if (provider.provider_type === 'gemini') {
      // Use only experimental flash model that's available in free tier
      modelsToTry = ['gemini-2.0-flash-exp'];
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
          max_tokens: 4000
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
