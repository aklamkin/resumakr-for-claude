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
import './config/passportAdmin.js';

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

import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';
import exportsRoutes from './routes/exports.js';
import templatesRoutes from './routes/templates.js';
import stripeProfilesRoutes from './routes/stripeProfiles.js';

// Admin routes (separate auth system)
import adminAuthRoutes from './routes/admin/auth.js';
import adminUsersRoutes from './routes/admin/adminUsers.js';
import adminSettingsRoutes from './routes/admin/settings.js';
import adminAppUsersRoutes from './routes/admin/users.js';
import adminProvidersRoutes from './routes/admin/providers.js';
import adminPromptsRoutes from './routes/admin/prompts.js';
import adminPlansRoutes from './routes/admin/plans.js';
import adminCouponsRoutes from './routes/admin/coupons.js';
import adminFaqRoutes from './routes/admin/faq.js';
import adminStripeProfilesRoutes from './routes/admin/stripeProfiles.js';

import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { maintenanceCheck } from './middleware/maintenance.js';
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

// CORS: allow both main frontend and config app origins
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.CONFIG_APP_URL || 'http://localhost:5174'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like server-to-server or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true
}));

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

// Maintenance mode check (blocks main app API when enabled, allows admin/health/public settings)
app.use(maintenanceCheck);

// Main app API routes
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

app.use('/api/exports', exportsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/stripe-profiles', stripeProfilesRoutes);

// Admin API routes (separate auth system via admin_users table)
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/admin-users', adminUsersRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/users', adminAppUsersRoutes);
app.use('/api/admin/providers', adminProvidersRoutes);
app.use('/api/admin/prompts', adminPromptsRoutes);
app.use('/api/admin/plans', adminPlansRoutes);
app.use('/api/admin/coupons', adminCouponsRoutes);
app.use('/api/admin/faq', adminFaqRoutes);
app.use('/api/admin/stripe-profiles', adminStripeProfilesRoutes);

app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')));

// Serve config app at /config (separate admin SPA)
const configAppDist = path.join(__dirname, '../../config-app/dist');
app.use('/config', express.static(configAppDist));
app.get('/config/*', (req, res) => {
  res.sendFile(path.join(configAppDist, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  log.info('Server started', { port: PORT, environment: process.env.NODE_ENV });
});

process.on('SIGTERM', () => {
  log.info('SIGTERM signal received: closing HTTP server');
});
