import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from './config/passport.js';

import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import resumeDataRoutes from './routes/resumeData.js';
import versionRoutes from './routes/versions.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/upload.js';
import subscriptionRoutes from './routes/subscriptions.js';
import providerRoutes from './routes/providers.js';
import promptRoutes from './routes/prompts.js';
import faqRoutes from './routes/faq.js';
import couponRoutes from './routes/coupons.js';
import settingsRoutes from './routes/settings.js';
import usersRoutes from './routes/users.js';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';

import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestIdMiddleware, httpLogger } from './middleware/requestId.js';
import logger, { log } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Global error handlers - MUST be at the top
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', { error: error.message, stack: error.stack });
  // Don't exit, just log it
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection', { reason: String(reason), promise: String(promise) });
});

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - CRITICAL for rate limiting behind nginx
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// Webhook routes MUST come before express.json() to get raw body
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Configure session for OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Request ID and HTTP logging middleware (replaces morgan)
app.use(requestIdMiddleware);
app.use(httpLogger);

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
app.use('/api/payments', paymentRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')));

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  log.info('Server started', { port: PORT, environment: process.env.NODE_ENV });
});

process.on('SIGTERM', () => {
  log.info('SIGTERM signal received: closing HTTP server');
});
