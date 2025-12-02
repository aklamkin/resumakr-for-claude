import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

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
    let extractedText;
    try {
      extractedText = await extractTextFromFile(filePath);
      console.log(`Successfully extracted text from ${filename}: ${extractedText.length} characters`);
    } catch (extractError) {
      console.error('Text extraction error:', extractError);
      return res.status(500).json({
        error: 'Failed to extract text from file',
        message: extractError.message,
        details: 'Unable to parse the uploaded file. Please ensure it is a valid PDF or DOCX document.'
      });
    }

    // Get active AI provider
    const providers = await query('SELECT * FROM ai_providers WHERE is_active = true ORDER BY is_default DESC LIMIT 1');
    if (providers.rows.length === 0) {
      return res.status(503).json({ error: 'No active AI providers configured' });
    }
    const provider = providers.rows[0];
    console.log(`Using AI provider: ${provider.name} (type: ${provider.provider_type})`);

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: provider.api_key });

    const prompt = `Extract structured resume information from the following text.\n\nResume Text:\n${extractedText}\n\nExtract and return ONLY valid JSON: {"personal_info": {"full_name": "", "email": "", "phone": ""}, "professional_summary": "", "work_experience": [{"company": "", "position": "", "start_date": "YYYY-MM", "responsibilities": [""]}], "education": [{"institution": "", "degree": ""}], "skills": [{"category": "Technical Skills", "items": [""]}]}`.trim();

    // Try different models in order of preference
    const modelsToTry = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
    let completion;
    let usedModel;
    let lastError;

    for (const model of modelsToTry) {
      try {
        console.log(`Attempting to use model: ${model}`);
        completion = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: 'You are an expert at extracting structured data from resumes. Return only valid JSON, no markdown formatting.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 3000
        });
        usedModel = model;
        console.log(`Successfully used model: ${model}`);
        break;
      } catch (modelError) {
        console.error(`Model ${model} failed:`, modelError.message);
        lastError = modelError;

        // If it's an authentication error, don't try other models
        if (modelError.status === 401 || modelError.message?.includes('Incorrect API key')) {
          throw new Error(`Invalid API key for provider ${provider.name}. Please check your AI provider configuration.`);
        }

        // If it's the last model, throw the error
        if (model === modelsToTry[modelsToTry.length - 1]) {
          throw new Error(`All models failed. Last error: ${modelError.message}`);
        }

        // Otherwise continue to next model
        continue;
      }
    }

    if (!completion) {
      throw lastError || new Error('Failed to get completion from any model');
    }

    // Parse the response
    const content = completion.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let extractedData;
    try {
      extractedData = JSON.parse(cleaned);
      console.log('Successfully parsed extracted data');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        message: 'The AI returned invalid JSON',
        details: parseError.message,
        raw_content: content.substring(0, 500) // First 500 chars for debugging
      });
    }

    // Return successful response
    res.json({
      status: 'success',
      output: extractedData,
      data: extractedData,
      raw_text: extractedText,
      extraction_method: 'ai',
      provider: provider.name,
      model_used: usedModel
    });
  } catch (error) {
    console.error('Extract data error:', error);
    console.error('Error stack:', error.stack);

    // Provide more specific error messages
    let errorMessage = 'Failed to extract data from file';
    let errorDetails = error.message;

    if (error.message?.includes('API key')) {
      errorMessage = 'AI Provider Configuration Error';
      errorDetails = 'The configured API key appears to be invalid. Please check your AI provider settings.';
    } else if (error.status === 429) {
      errorMessage = 'Rate Limit Exceeded';
      errorDetails = 'The AI provider rate limit has been exceeded. Please try again in a few moments.';
    } else if (error.status === 500) {
      errorMessage = 'AI Provider Error';
      errorDetails = 'The AI provider encountered an error. Please try again.';
    }

    res.status(500).json({
      error: errorMessage,
      message: errorDetails,
      technical_details: error.message
    });
  }
});

export default router;
