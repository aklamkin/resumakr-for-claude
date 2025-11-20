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
    const extractedText = await extractTextFromFile(filePath);
    const providers = await query('SELECT * FROM ai_providers WHERE is_active = true ORDER BY is_default DESC LIMIT 1');
    if (providers.rows.length === 0) {
      return res.status(503).json({ error: 'No active AI providers configured' });
    }
    const provider = providers.rows[0];
    const openai = new OpenAI({ apiKey: provider.api_key });
    const prompt = `Extract structured resume information from the following text.\n\nResume Text:\n${extractedText}\n\nExtract and return ONLY valid JSON: {"personal_info": {"full_name": "", "email": "", "phone": ""}, "professional_summary": "", "work_experience": [{"company": "", "position": "", "start_date": "YYYY-MM", "responsibilities": [""]}], "education": [{"institution": "", "degree": ""}], "skills": [{"category": "Technical Skills", "items": [""]}]}`.trim();
    const completion = await openai.chat.completions.create({ model: 'gpt-4', messages: [{ role: 'system', content: 'You are an expert at extracting structured data from resumes.' }, { role: 'user', content: prompt }], temperature: 0.1, max_tokens: 3000 });
    const content = completion.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const extractedData = JSON.parse(cleaned);
    res.json({ data: extractedData, raw_text: extractedText, extraction_method: 'ai', provider: provider.name });
  } catch (error) {
    console.error('Extract data error:', error);
    res.status(500).json({ error: 'Failed to extract data from file', message: error.message });
  }
});

export default router;
