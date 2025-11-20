import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import resumeDataRoutes from './routes/resumeData.js';
import versionRoutes from './routes/versions.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/upload.js';
import subscriptionRoutes from './routes/subscriptions.js';
import providerRoutes from './routes/providers.js';
import faqRoutes from './routes/faq.js';
import couponRoutes from './routes/coupons.js';

import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/resume-data', resumeDataRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/coupons', couponRoutes);

app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')));

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Resumakr API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
});
