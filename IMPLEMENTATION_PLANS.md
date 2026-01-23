# Implementation Plans

This document contains detailed implementation plans for the following enhancements:
1. Password Reset (auth-type aware)
2. Test Suite
3. Cloud Storage Options
4. Structured Logging
5. Input Validation

---

## 1. Password Reset Implementation (Auth-Type Aware)

### Overview
Implement password reset functionality that is **only available for email/password accounts**, not OAuth-only accounts.

### Current State Analysis

**Database Schema (`users` table):**
- `password` - nullable (NULL for OAuth-only users)
- `oauth_provider` - stores 'google', 'microsoft', 'github', 'apple', or NULL
- `oauth_id` - stores OAuth provider's user ID

**Authentication Types:**
1. **Email/Password only**: `password IS NOT NULL AND oauth_provider IS NULL`
2. **OAuth only**: `password IS NULL AND oauth_provider IS NOT NULL`
3. **Linked accounts**: `password IS NOT NULL AND oauth_provider IS NOT NULL` (user registered with email, then linked OAuth)

**Key Insight:** Users eligible for password reset are those with `password IS NOT NULL`.

### Implementation Plan

#### Phase 1: Database Migration

**File: `backend/migrations/008_password_reset.sql`**
```sql
-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Add auth_type computed helper (optional, for convenience)
COMMENT ON TABLE password_reset_tokens IS 'Stores temporary tokens for password reset functionality';
```

#### Phase 2: Backend API Endpoints

**File: `backend/src/routes/auth.js` - Add new endpoints:**

```javascript
// POST /api/auth/forgot-password
// Request: { email: string }
// Response: { message: "If an account exists, a reset email has been sent" }
// Note: Always returns success to prevent email enumeration attacks

// POST /api/auth/reset-password
// Request: { token: string, new_password: string }
// Response: { message: "Password reset successful" }

// GET /api/auth/verify-reset-token/:token
// Response: { valid: boolean, email?: string (masked) }
```

**Implementation Details:**

1. **Forgot Password Endpoint:**
   - Validate email format
   - Check if user exists AND has a password (eligible for reset)
   - Generate cryptographically secure token (crypto.randomBytes)
   - Store token with 1-hour expiry
   - Send email via configured email service (Resend, SendGrid, or SMTP)
   - Always return success message (security best practice)

2. **Reset Password Endpoint:**
   - Validate token exists and not expired
   - Validate token not already used
   - Validate new password strength (min 8 chars)
   - Hash new password with bcrypt
   - Update user's password
   - Mark token as used
   - Invalidate all existing tokens for this user
   - Return success

3. **Verify Token Endpoint:**
   - Check if token exists and is valid
   - Return masked email (j***@example.com) for UX

**New Dependencies:**
- Email service: Recommend `resend` package (simple, modern API)
- Alternatively: `nodemailer` for SMTP

#### Phase 3: Frontend Components

**New Pages/Components:**

1. **`frontend/src/pages/ForgotPassword.jsx`**
   - Email input form
   - Submit button
   - Success/error messaging
   - Link back to login

2. **`frontend/src/pages/ResetPassword.jsx`**
   - Token validation on mount
   - New password input (with confirmation)
   - Password strength indicator
   - Submit button
   - Redirect to login on success

3. **Update `frontend/src/pages/Login.jsx`**
   - Add "Forgot password?" link below password field
   - Only show for email/password login section (not OAuth section)

4. **Update `frontend/src/api/apiClient.js`**
   ```javascript
   auth: {
     // ... existing methods
     async forgotPassword(email) {
       const { data } = await client.post('/auth/forgot-password', { email });
       return data;
     },
     async resetPassword(token, new_password) {
       const { data } = await client.post('/auth/reset-password', { token, new_password });
       return data;
     },
     async verifyResetToken(token) {
       const { data } = await client.get(`/auth/verify-reset-token/${token}`);
       return data;
     }
   }
   ```

5. **Update `frontend/src/pages/index.jsx`**
   - Add routes: `/forgot-password`, `/reset-password/:token`

#### Phase 4: User Account Settings

**Update Account Settings to show auth type and conditionally show password change:**

1. **Add to `/api/auth/me` response:**
   ```javascript
   {
     // ... existing fields
     auth_type: 'email' | 'oauth' | 'linked',  // computed from password/oauth_provider
     oauth_provider: string | null,
     has_password: boolean
   }
   ```

2. **Frontend Settings Page:**
   - If `has_password === true`: Show "Change Password" section
   - If `auth_type === 'oauth'` and `has_password === false`: Show "Set Password" option to enable email login
   - Display connected OAuth providers

#### Phase 5: Email Configuration

**Environment Variables:**
```env
# Email Configuration
EMAIL_PROVIDER=resend  # or 'smtp'
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@resumakr.us

# Or for SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
```

**Email Templates:**
- Create `backend/src/templates/password-reset.html` with branded email template

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/migrations/008_password_reset.sql` | Create | Password reset tokens table |
| `backend/src/routes/auth.js` | Modify | Add 3 new endpoints |
| `backend/src/services/email.js` | Create | Email sending service |
| `backend/src/templates/password-reset.html` | Create | Email template |
| `frontend/src/pages/ForgotPassword.jsx` | Create | Forgot password page |
| `frontend/src/pages/ResetPassword.jsx` | Create | Reset password page |
| `frontend/src/pages/Login.jsx` | Modify | Add forgot password link |
| `frontend/src/pages/index.jsx` | Modify | Add routes |
| `frontend/src/api/apiClient.js` | Modify | Add API methods |
| `backend/.env.example` | Modify | Add email config vars |

### Security Considerations

1. **Token Security:**
   - Use `crypto.randomBytes(32).toString('hex')` for tokens
   - Tokens expire after 1 hour
   - Tokens are single-use
   - All tokens invalidated after successful reset

2. **Rate Limiting:**
   - Limit forgot-password to 3 requests per email per hour
   - Limit reset attempts to 5 per token

3. **Email Enumeration Prevention:**
   - Always return same message regardless of email existence
   - Same response time for existing/non-existing emails

4. **Password Requirements:**
   - Minimum 8 characters
   - Consider adding complexity rules

---

## 2. Test Suite Implementation

### Overview
Add comprehensive testing with Jest (backend) and Vitest (frontend) to ensure code quality and prevent regressions.

### Backend Testing Setup

#### Dependencies
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "supertest": "^6.3.0",
    "testcontainers": "^10.0.0"
  }
}
```

#### Test Structure
```
backend/
├── src/
├── tests/
│   ├── setup.js              # Test setup and teardown
│   ├── fixtures/             # Test data fixtures
│   │   ├── users.js
│   │   ├── resumes.js
│   │   └── subscriptions.js
│   ├── unit/                 # Unit tests
│   │   ├── middleware/
│   │   │   ├── auth.test.js
│   │   │   └── errorHandler.test.js
│   │   └── services/
│   │       └── email.test.js
│   ├── integration/          # API integration tests
│   │   ├── auth.test.js
│   │   ├── resumes.test.js
│   │   ├── subscriptions.test.js
│   │   └── webhooks.test.js
│   └── e2e/                  # End-to-end tests (optional)
└── jest.config.js
```

#### Configuration Files

**`backend/jest.config.js`:**
```javascript
export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {}
};
```

**`backend/tests/setup.js`:**
```javascript
import { query } from '../src/config/database.js';

// Clean database before each test
beforeEach(async () => {
  await query('TRUNCATE users, resumes, resume_data CASCADE');
});

// Close database connection after all tests
afterAll(async () => {
  // Close pool
});
```

#### Priority Test Cases

**High Priority (Implement First):**

1. **Authentication Tests (`auth.test.js`):**
   - Register with valid credentials
   - Register with duplicate email (should fail)
   - Login with valid credentials
   - Login with wrong password (should fail)
   - JWT token generation and validation
   - Password change flow
   - OAuth callback handling

2. **Resume Tests (`resumes.test.js`):**
   - Create resume (authenticated)
   - Create resume (unauthenticated - should fail)
   - List user's resumes (should only show own)
   - Update resume (owner only)
   - Delete resume (owner only)

3. **Subscription Tests (`subscriptions.test.js`):**
   - Protected endpoint without subscription (should fail)
   - Protected endpoint with active subscription
   - Expired subscription handling
   - Stripe webhook processing

**Medium Priority:**

4. **File Upload Tests (`upload.test.js`):**
   - PDF upload and parsing
   - DOCX upload and parsing
   - Invalid file type rejection
   - File size limit enforcement

5. **AI Integration Tests (`ai.test.js`):**
   - Provider selection logic
   - Error handling for API failures
   - Rate limiting behavior

#### Scripts

**`backend/package.json`:**
```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--experimental-vm-modules' jest",
    "test:watch": "NODE_OPTIONS='--experimental-vm-modules' jest --watch",
    "test:coverage": "NODE_OPTIONS='--experimental-vm-modules' jest --coverage",
    "test:ci": "NODE_OPTIONS='--experimental-vm-modules' jest --ci --coverage"
  }
}
```

### Frontend Testing Setup

#### Dependencies
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^23.0.0",
    "msw": "^2.0.0"
  }
}
```

#### Test Structure
```
frontend/
├── src/
├── tests/
│   ├── setup.ts              # Test setup
│   ├── mocks/
│   │   └── handlers.js       # MSW API mock handlers
│   ├── components/           # Component tests
│   │   ├── Button.test.jsx
│   │   └── ResumeCard.test.jsx
│   └── pages/                # Page tests
│       ├── Login.test.jsx
│       └── Dashboard.test.jsx
└── vitest.config.js
```

#### Configuration

**`frontend/vitest.config.js`:**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

#### Priority Test Cases

**High Priority:**

1. **Login Page Tests:**
   - Renders login form
   - Handles successful login
   - Shows error on failed login
   - Redirects after login

2. **Resume Builder Tests:**
   - Form validation
   - Step navigation
   - Data persistence between steps

3. **API Client Tests:**
   - Request interceptors (token injection)
   - Response interceptors (401 handling)
   - Error handling

### Files to Create

| File | Description |
|------|-------------|
| `backend/jest.config.js` | Jest configuration |
| `backend/tests/setup.js` | Test setup/teardown |
| `backend/tests/fixtures/*.js` | Test data |
| `backend/tests/integration/auth.test.js` | Auth API tests |
| `backend/tests/integration/resumes.test.js` | Resume API tests |
| `frontend/vitest.config.js` | Vitest configuration |
| `frontend/tests/setup.ts` | Test setup |
| `frontend/tests/mocks/handlers.js` | MSW handlers |
| `frontend/tests/pages/Login.test.jsx` | Login page tests |

---

## 3. Cloud Storage Options Assessment

### Current State

**Production Environment (Railway):**
- Backend runs on Railway with Nixpacks
- PostgreSQL database on Railway
- Files stored locally in `./uploads` directory
- **Problem:** Railway's ephemeral filesystem means uploaded files are lost on deploy

### Storage Options Analysis

#### Option A: PostgreSQL Large Objects (bytea/TOAST)

**How it works:** Store files as binary data directly in PostgreSQL.

**Pros:**
- No additional services needed
- Same backup/restore as database
- ACID compliance
- Already have PostgreSQL on Railway

**Cons:**
- Increases database size significantly
- Slower for large files
- Complicates database backups
- Not recommended for files > 10MB

**Best for:** Small files (< 5MB), low volume

**Implementation:**
```sql
CREATE TABLE file_storage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_data BYTEA NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Option B: Railway Volume (Persistent Storage)

**How it works:** Mount a persistent volume to Railway service.

**Pros:**
- Simple to set up
- No code changes needed (just config)
- Files persist across deploys
- Railway-native solution

**Cons:**
- Limited to Railway
- Volume tied to single service instance
- Manual backup management
- Storage costs apply

**Cost:** ~$0.25/GB/month

**Implementation:**
1. Railway Dashboard → Service → Settings → Volumes
2. Add volume mounted at `/app/uploads`
3. Set `UPLOAD_DIR=/app/uploads`

#### Option C: Cloudflare R2 (S3-Compatible)

**How it works:** Object storage with S3-compatible API.

**Pros:**
- No egress fees (huge cost savings)
- S3-compatible (easy migration)
- Global CDN included
- 10GB free tier

**Cons:**
- Additional service to manage
- Code changes required
- API credentials management

**Cost:** Free tier: 10GB storage, 10M reads, 1M writes/month. Then $0.015/GB.

**Implementation:**
```javascript
// Using @aws-sdk/client-s3
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  }
});
```

#### Option D: AWS S3

**How it works:** Industry-standard object storage.

**Pros:**
- Highly reliable
- Extensive documentation
- Many integrations available
- Presigned URLs for direct uploads

**Cons:**
- Egress fees can be expensive
- More complex pricing
- Additional AWS account needed

**Cost:** ~$0.023/GB storage + $0.09/GB egress

#### Option E: Supabase Storage

**How it works:** S3-compatible storage built on PostgreSQL.

**Pros:**
- Easy to use
- Good free tier (1GB)
- Built-in auth integration
- CDN included

**Cons:**
- Another service to manage
- Vendor lock-in

**Cost:** Free: 1GB. Pro: $25/month includes 100GB.

### Recommendation

**For Resumakr's use case (resume PDFs, typically < 5MB):**

1. **Immediate/Simple:** Railway Volume (Option B)
   - Fastest to implement
   - No code changes
   - Works for MVP

2. **Long-term/Scalable:** Cloudflare R2 (Option C)
   - Best cost structure (no egress fees)
   - S3-compatible for easy migration
   - 10GB free tier covers most startups

3. **If already using AWS:** AWS S3 (Option D)
   - Leverage existing infrastructure

### Implementation Plan for Cloudflare R2

#### Phase 1: Setup Cloudflare R2

1. Create Cloudflare account
2. Enable R2 in dashboard
3. Create bucket: `resumakr-uploads`
4. Generate API token with R2 read/write permissions

#### Phase 2: Backend Changes

**New file: `backend/src/services/storage.js`**
```javascript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  }
});

export async function uploadFile(key, buffer, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFile(key) {
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  }));
}
```

**Update `backend/src/routes/upload.js`:**
- Change from disk storage to R2 storage
- Return R2 URLs instead of local paths

#### Phase 3: Environment Variables

```env
# Cloudflare R2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY=<access-key>
R2_SECRET_KEY=<secret-key>
R2_BUCKET=resumakr-uploads
R2_PUBLIC_URL=https://uploads.resumakr.us  # Custom domain or R2.dev URL
```

---

## 4. Structured Logging Implementation

### Overview
Replace `console.log` statements with structured logging using Winston for better debugging, monitoring, and log aggregation.

### Current State
- Uses `console.log`, `console.error` throughout
- Morgan for HTTP request logging
- No log levels, correlation IDs, or structured format

### Implementation Plan

#### Phase 1: Logger Setup

**Dependencies:**
```json
{
  "dependencies": {
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.0"
  }
}
```

**New file: `backend/src/utils/logger.js`**
```javascript
import winston from 'winston';

const { combine, timestamp, json, errors, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? json() : devFormat
  ),
  defaultMeta: { service: 'resumakr-api' },
  transports: [
    new winston.transports.Console(),
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}

export default logger;
```

#### Phase 2: Request Correlation

**New middleware: `backend/src/middleware/requestId.js`**
```javascript
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

export function requestIdMiddleware(req, res, next) {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.requestId);

  // Create child logger with request context
  req.log = logger.child({
    requestId: req.requestId,
    path: req.path,
    method: req.method
  });

  next();
}
```

#### Phase 3: Replace console.log

**Before:**
```javascript
console.log('Registration attempt:', { email: req.body.email });
console.error('Register error details:', { message: error.message });
```

**After:**
```javascript
req.log.info('Registration attempt', { email: req.body.email });
req.log.error('Registration failed', { error: error.message, stack: error.stack });
```

#### Phase 4: HTTP Request Logging

**Replace Morgan with Winston:**
```javascript
import logger from './utils/logger.js';

// Custom Morgan-like format using Winston
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.log.info('HTTP Request', {
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  });
  next();
});
```

### Log Levels Usage Guide

| Level | Usage |
|-------|-------|
| `error` | Application errors, exceptions, failed operations |
| `warn` | Deprecated usage, retry attempts, non-critical issues |
| `info` | Successful operations, state changes, important events |
| `http` | HTTP request/response logging |
| `debug` | Detailed debugging information (disabled in production) |

### Files to Create/Modify

| File | Action |
|------|--------|
| `backend/src/utils/logger.js` | Create |
| `backend/src/middleware/requestId.js` | Create |
| `backend/src/server.js` | Modify - add middleware, replace morgan |
| `backend/src/routes/*.js` | Modify - replace console.log with logger |

### Log Output Examples

**Development:**
```
2024-01-16T12:00:00.000Z [INFO] Registration attempt { email: "user@example.com" }
2024-01-16T12:00:00.100Z [INFO] User created { userId: 123 }
```

**Production (JSON):**
```json
{"level":"info","message":"Registration attempt","email":"user@example.com","timestamp":"2024-01-16T12:00:00.000Z","service":"resumakr-api","requestId":"abc-123"}
```

---

## 5. Input Validation Implementation

### Overview
Add comprehensive input validation using Joi or Zod to prevent invalid data and security vulnerabilities.

### Current State
- Minimal validation (email/password required checks)
- No schema validation
- No sanitization

### Implementation Plan

#### Phase 1: Choose Validation Library

**Recommendation: Zod**
- TypeScript-first (but works with JS)
- Better developer experience
- Smaller bundle size
- Good error messages

**Alternative: Joi**
- More mature
- Extensive validation options
- Larger community

#### Phase 2: Setup

**Dependencies:**
```json
{
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

**New file: `backend/src/validators/schemas.js`**
```javascript
import { z } from 'zod';

// Common schemas
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

// Auth schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().max(100).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordSchema
});

// Resume schemas
export const createResumeSchema = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  source_type: z.enum(['manual', 'upload', 'ai']).optional()
});

export const personalInfoSchema = z.object({
  full_name: z.string().max(100).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal(''))
});

// Subscription schemas
export const checkoutSchema = z.object({
  plan_id: z.number().int().positive(),
  coupon_code: z.string().optional()
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional()
});
```

#### Phase 3: Validation Middleware

**New file: `backend/src/middleware/validate.js`**
```javascript
import { ZodError } from 'zod';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body
                 : source === 'query' ? req.query
                 : req.params;

      const validated = schema.parse(data);

      // Replace original data with validated/transformed data
      if (source === 'body') req.body = validated;
      else if (source === 'query') req.query = validated;
      else req.params = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}
```

#### Phase 4: Apply to Routes

**Example: `backend/src/routes/auth.js`**
```javascript
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validators/schemas.js';

router.post('/register', validate(registerSchema), async (req, res) => {
  // req.body is now validated and sanitized
  const { email, password, full_name } = req.body;
  // ...
});

router.post('/login', validate(loginSchema), async (req, res) => {
  // ...
});

router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
  // ...
});
```

#### Phase 5: Sanitization

Add sanitization for XSS prevention:

```javascript
import { z } from 'zod';

// Custom sanitization transformer
const sanitizeHtml = (str) => str
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;');

export const safeString = z.string().transform(sanitizeHtml);

// Use in schemas
export const resumeTitleSchema = safeString.min(1).max(200);
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `backend/src/validators/schemas.js` | Create |
| `backend/src/middleware/validate.js` | Create |
| `backend/src/routes/auth.js` | Modify |
| `backend/src/routes/resumes.js` | Modify |
| `backend/src/routes/payments.js` | Modify |
| `backend/package.json` | Add zod dependency |

### Error Response Format

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

---

## Implementation Priority

Recommended order based on impact and dependencies:

1. **Input Validation** (1-2 days)
   - Foundation for other features
   - Immediate security benefit
   - No external dependencies

2. **Structured Logging** (1 day)
   - Helps debug other implementations
   - Improves production monitoring

3. **Password Reset** (2-3 days)
   - User-facing feature
   - Requires email service setup

4. **Test Suite** (3-5 days)
   - Ensures quality of above implementations
   - Prevents regressions

5. **Cloud Storage** (1-2 days)
   - Depends on production needs
   - Can use Railway Volume as quick fix

---

*Document generated: 2026-01-16*
*Baseline version: v1.0.0-pre-enhancements*
