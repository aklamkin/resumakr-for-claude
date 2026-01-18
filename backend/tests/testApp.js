/**
 * Test Application Factory
 * Creates an Express app instance configured for testing
 */

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from '../src/config/passport.js';

import authRoutes from '../src/routes/auth.js';
import resumeRoutes from '../src/routes/resumes.js';
import resumeDataRoutes from '../src/routes/resumeData.js';
import subscriptionRoutes from '../src/routes/subscriptions.js';
import paymentRoutes from '../src/routes/payments.js';

import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFound } from '../src/middleware/notFound.js';

export function createTestApp() {
  const app = express();

  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    session({
      secret: 'test-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/resume-data', resumeDataRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/payments', paymentRoutes);

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
