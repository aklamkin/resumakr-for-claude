# Changelog - January 17, 2025

## Summary

This release implements four major features:
1. **Input Validation with Zod** - Server-side request validation for all API endpoints
2. **Structured Logging with Winston** - Production-ready logging with request tracing
3. **Password Reset Feature** - Complete forgot password / reset password flow
4. **Test Suite with Vitest** - Automated testing for backend API endpoints

---

## 1. Input Validation with Zod

### Overview
Added comprehensive server-side validation using [Zod](https://zod.dev/) schema validation library. All API endpoints now validate incoming request data before processing.

### New Files Created

#### `backend/src/validators/schemas.js`
**Purpose**: Centralized Zod schema definitions for all API requests

**Schemas Defined**:

| Schema Name | Used By | Validation Rules |
|------------|---------|------------------|
| `emailSchema` | Auth routes | Valid email, lowercase, trimmed, max 255 chars |
| `passwordSchema` | Auth routes | Min 8 chars, max 128 chars |
| `idParamSchema` | Routes with integer IDs | Positive integer, coerced from string |
| `uuidParamSchema` | Routes with UUID IDs (resumes, users) | Valid UUID format |
| `registerSchema` | POST /api/auth/register | email, password, optional full_name (max 100) |
| `loginSchema` | POST /api/auth/login | email, password (min 1 char) |
| `changePasswordSchema` | POST /api/auth/change-password | current_password, new_password |
| `forgotPasswordSchema` | POST /api/auth/forgot-password | email only |
| `resetPasswordSchema` | POST /api/auth/reset-password | token, new_password |
| `updateProfileSchema` | PUT /api/auth/me | Optional: full_name, is_subscribed, subscription_plan, subscription_end_date |
| `createResumeSchema` | POST /api/resumes | title (required, sanitized), optional status enum, optional source_type enum |
| `updateResumeSchema` | PUT /api/resumes/:id | All fields optional: title, status, source_type |
| `resumeDataSchema` | Resume data endpoints | personal_info, work_experience, education, skills, etc. |
| `createPlanSchema` | POST /api/subscriptions/plans | name, price, billing_period, features, is_active, stripe_price_id |
| `checkoutSchema` | POST /api/payments/checkout | plan_id, optional coupon_code |
| `createCouponSchema` | Coupon management | code, discount_type, discount_value, max_uses, expires_at, applicable_plans |
| `createProviderSchema` | AI provider management | name, provider_type enum, api_key, model_name, is_active, config |
| `paginationSchema` | List endpoints | page (default 1), limit (1-100, default 20), sort |

**Helper Functions**:
- `safeString(maxLength)` - Creates a string schema with XSS sanitization (HTML entity encoding)
- `sanitizeString(str)` - Internal function that encodes `&`, `<`, `>`, `"`, `'`

**Enum Values**:
- Resume status: `'draft'`, `'active'`, `'archived'`
- Resume source_type: `'manual'`, `'upload'`, `'ai'`
- Billing period: `'monthly'`, `'yearly'`, `'one-time'`
- AI provider types: `'openai'`, `'gemini'`, `'openrouter'`, `'groq'`, `'perplexity'`, `'anthropic'`

---

#### `backend/src/middleware/validate.js`
**Purpose**: Express middleware factory for applying Zod validation

**Exported Functions**:

```javascript
// Single source validation
validate(schema, source = 'body')
// source can be: 'body', 'query', or 'params'

// Multiple sources at once
validateMultiple({ body: schema1, params: schema2, query: schema3 })
```

**Behavior**:
1. Parses request data against Zod schema
2. If valid: replaces request data with validated/transformed data, calls `next()`
3. If invalid: returns 400 with structured error response:
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format", "code": "invalid_string" }
  ]
}
```
4. Logs validation failures via Winston logger

**Line-by-Line Reference**:
- Lines 10-71: `validate()` function
- Lines 78-143: `validateMultiple()` function
- Lines 46-64: Zod error handling and response formatting

---

### Files Modified

#### `backend/src/routes/auth.js`
**Changes**:
- Line 9-10: Added imports for `validate` and schemas
- Line 19: Added `validate(registerSchema)` middleware to POST /register
- Line 63: Added `validate(loginSchema)` middleware to POST /login
- Line 101: Added `validate(updateProfileSchema)` middleware to PUT /me
- Line 131: Added `validate(changePasswordSchema)` middleware to POST /change-password
- Line 180: Added `validate(forgotPasswordSchema)` middleware to POST /forgot-password
- Line 280: Added `validate(resetPasswordSchema)` middleware to POST /reset-password

#### `backend/src/routes/resumes.js`
**Changes**:
- Line 4-5: Added imports for `validate`, `createResumeSchema`, `updateResumeSchema`, `uuidParamSchema`, `resumeQuerySchema`
- Line 23: Added `validate(resumeQuerySchema, 'query')` to GET /
- Line 48: Added `validate(uuidParamSchema, 'params')` to GET /:id
- Line 60: Added `validate(createResumeSchema)` to POST /
- Line 75: Added `validate(uuidParamSchema, 'params')` and `validate(updateResumeSchema)` to PUT /:id
- Line 101: Added `validate(uuidParamSchema, 'params')` to DELETE /:id

**Important Fix**: Changed from `idParamSchema` (expects integer) to `uuidParamSchema` (expects UUID) because resumes use UUID primary keys.

#### `backend/src/routes/coupons.js`
**Changes**: Added validation to coupon CRUD endpoints

#### `backend/package.json`
**Changes**:
- Line 46: Added `"zod": "^3.25.76"` to dependencies

---

## 2. Structured Logging with Winston

### Overview
Replaced scattered `console.log` calls with structured Winston logging. Provides:
- JSON format in production (for log aggregation)
- Colored readable format in development
- Request ID tracing across all log entries
- Domain-specific log helpers (auth, db, api, stripe, ai)

### New Files Created

#### `backend/src/utils/logger.js`
**Purpose**: Winston logger configuration and helpers

**Configuration**:
- Log level: `process.env.LOG_LEVEL` or `'info'` (production) / `'debug'` (development)
- Default meta: `{ service: 'resumakr-api' }`
- Timestamp format: `'YYYY-MM-DD HH:mm:ss.SSS'`

**Transports**:
| Environment | Format | Destination |
|-------------|--------|-------------|
| Production | JSON | Console |
| Production (LOG_TO_FILE=true) | JSON | `logs/error.log`, `logs/combined.log` |
| Development | Colored, readable | Console |

**Exported Functions**:

```javascript
// Create request-scoped child logger
createRequestLogger(requestId, path, method, userId = null)

// Log object with convenience methods
log.error(message, meta)
log.warn(message, meta)
log.info(message, meta)
log.debug(message, meta)

// Domain-specific helpers (auto-add domain tag)
log.auth(message, meta)   // domain: 'auth'
log.db(message, meta)     // domain: 'database'
log.api(message, meta)    // domain: 'api'
log.stripe(message, meta) // domain: 'stripe'
log.ai(message, meta)     // domain: 'ai'

// HTTP request logging
log.http(req, res, duration) // Logs method, path, status, duration, userAgent, ip, userId
```

**Log Entry Structure** (Production JSON):
```json
{
  "level": "info",
  "message": "Login successful",
  "timestamp": "2025-01-17T12:34:56.789Z",
  "service": "resumakr-api",
  "domain": "auth",
  "userId": "uuid-here",
  "requestId": "request-uuid"
}
```

**Line-by-Line Reference**:
- Lines 1-8: Imports and Winston format destructuring
- Lines 10-15: Custom development format with request ID prefix
- Lines 17-18: Log level determination
- Lines 20-48: Logger creation with environment-specific transports
- Lines 50-64: Optional file transports for production
- Lines 66-74: `createRequestLogger()` function
- Lines 76-109: `log` helper object with domain-specific methods

---

#### `backend/src/middleware/requestId.js`
**Purpose**: Middleware to add request IDs and request-scoped loggers

**Exported Functions**:

```javascript
// Add req.requestId and req.log to every request
requestIdMiddleware(req, res, next)

// Log completed requests with timing
httpLogger(req, res, next)
```

**Behavior of `requestIdMiddleware`**:
1. Uses `X-Request-ID` header if present, otherwise generates new UUID
2. Sets `X-Request-ID` response header for tracing
3. Creates `req.log` child logger with request context

**Behavior of `httpLogger`**:
1. Records start time
2. On response `finish` event, logs request with duration
3. Log level based on status code: 500+ = error, 400+ = warn, else info

---

### Files Modified

#### `backend/src/server.js`
**Changes**:
- Added import for logger and request ID middleware
- Added `requestIdMiddleware` early in middleware stack
- Added `httpLogger` for request completion logging
- Replaced `console.log` startup message with `log.info`

#### `backend/src/routes/auth.js`
**Changes**:
- Line 11: Added `import { log } from '../utils/logger.js'`
- Lines 24, 28, 42: Added `log.auth()` calls for registration flow
- Lines 70, 77, 83, 89: Added `log.auth()` calls for login flow
- Lines 119, 122, 146, 153, 163, 166: Added logging for password change
- Lines 184, 196, 204, 228, 233, 259, 271, 293, 311, 315: Added logging for password reset

#### `backend/src/middleware/validate.js`
**Changes**:
- Line 2: Added `import { log } from '../utils/logger.js'`
- Lines 53-59, 128-133: Added `log.warn()` for validation failures

---

## 3. Password Reset Feature

### Overview
Complete forgot password / reset password flow with:
- Secure random token generation
- 1-hour token expiration
- Email delivery via Resend
- Frontend pages for forgot password and reset password
- Anti-enumeration security (always returns success message)

### Database Migration

#### `backend/migrations/008_password_reset.sql`
**Purpose**: Create password_reset_tokens table

**Table Schema**:
```sql
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_password_reset_tokens_token` - Fast token lookup
- `idx_password_reset_tokens_expires` - Cleanup of expired tokens
- `idx_password_reset_tokens_user` - Find tokens by user

**Token Lifecycle**:
1. Created with 1-hour expiration
2. `used_at` is NULL until used
3. On use, `used_at` set to NOW()
4. All other tokens for user invalidated on use
5. ON DELETE CASCADE removes tokens when user deleted

---

### Backend Implementation

#### `backend/src/services/email.js`
**Purpose**: Email sending service using Resend

**Configuration**:
- `RESEND_API_KEY` - Required for production
- `EMAIL_FROM` - Sender address (default: `Resumakr <noreply@resumakr.us>`)
- `FRONTEND_URL` - For reset link generation

**Exported Functions**:

```javascript
// Send password reset email
async sendPasswordResetEmail(email, token, userName = 'there')
// Returns: { success: boolean, error?: string, messageId?: string, devMode?: boolean }
```

**Behavior**:
1. If `RESEND_API_KEY` not set:
   - In development: logs reset link to console, returns `{ success: true, devMode: true }`
   - In production: returns `{ success: false, error: 'Email service not configured' }`
2. Sends HTML and plain text versions
3. Logs success/failure with message ID

**Email Template**:
- Branded HTML email with gradient header
- Reset button with link
- 1-hour expiration notice
- Plain text fallback
- XSS-safe name interpolation via `escapeHtml()`

**Line-by-Line Reference**:
- Lines 1-11: Initialization and configuration
- Lines 23-61: `sendPasswordResetEmail()` function
- Lines 67-110: HTML email template
- Lines 115-131: Plain text email template
- Lines 137-144: HTML escape helper

---

#### `backend/src/routes/auth.js` - Password Reset Endpoints

**POST /api/auth/forgot-password** (Lines 180-237)
- Validates email format
- Looks up user by email
- If not found or OAuth-only: returns success (anti-enumeration)
- Generates 32-byte random token (64 hex characters)
- Invalidates existing tokens for user
- Stores new token with 1-hour expiration
- Sends reset email
- Always returns: `{ message: "If an account with that email exists..." }`

**GET /api/auth/verify-reset-token/:token** (Lines 243-274)
- Validates token format (min 10 chars)
- Queries for valid, unused, non-expired token
- Returns `{ valid: false, error: "..." }` if invalid
- Returns `{ valid: true, email: "j***@example.com" }` if valid
- Email masked for privacy

**POST /api/auth/reset-password** (Lines 280-318)
- Validates token and new_password (Zod schema)
- Queries for valid token
- Returns 400 if invalid/expired
- Hashes new password with bcrypt
- Updates user password
- Marks token as used
- Invalidates all other tokens for user
- Returns success message

---

### Frontend Implementation

#### `frontend/src/pages/ForgotPassword.jsx`
**Purpose**: Email input form for requesting password reset

**Components Used**:
- Card, CardContent, CardDescription, CardHeader, CardTitle (Radix UI)
- Button, Input, Alert (Radix UI)
- ArrowLeft, Mail, CheckCircle icons (Lucide)

**State**:
- `email` - Input value
- `loading` - Submit in progress
- `submitted` - Success state
- `error` - Error message (unused, always shows success)

**Flow**:
1. User enters email and submits
2. Calls `api.auth.forgotPassword(email)`
3. Always shows success page (prevents enumeration)
4. Success page shows "Check your email" message
5. Options: "Try a different email" or "Back to login"

**API Call**: `POST /api/auth/forgot-password` with `{ email }`

---

#### `frontend/src/pages/ResetPassword.jsx`
**Purpose**: Password reset form accessed via email link

**URL**: `/reset-password?token=<token>`

**Components Used**:
- Card, CardContent, CardDescription, CardHeader, CardTitle (Radix UI)
- Button, Input, Alert (Radix UI)
- ArrowLeft, Lock, CheckCircle, XCircle, Loader2 icons (Lucide)

**State**:
- `password` - New password input
- `confirmPassword` - Confirmation input
- `loading` - Submit in progress
- `verifying` - Token verification in progress
- `tokenValid` - Token validation result
- `maskedEmail` - Email from token verification (e.g., "j***@example.com")
- `error` - Error message
- `success` - Success state

**Flow**:
1. On mount, extracts `token` from URL params
2. Calls `api.auth.verifyResetToken(token)`
3. If invalid: shows "Invalid Reset Link" page with "Request New Reset Link" button
4. If valid: shows password form with masked email
5. Client-side validation: passwords match, min 8 chars
6. Calls `api.auth.resetPassword(token, password)`
7. On success: shows "Password Reset Successful" with "Go to Login" button

**States Rendered**:
1. Loading (verifying token)
2. Invalid token
3. Password form
4. Success

---

#### `frontend/src/pages/index.jsx`
**Changes**:
- Added imports for ForgotPassword and ResetPassword pages
- Added routes:
  - `<Route path="/forgot-password" element={<ForgotPassword />} />`
  - `<Route path="/reset-password" element={<ResetPassword />} />`

#### `frontend/src/api/apiClient.js`
**Changes**:
- Added to `auth` object:
```javascript
forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
verifyResetToken: (token) => api.get(`/auth/verify-reset-token/${token}`).then(res => res.data),
resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
```

---

### Environment Variables Required

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | Production | - | Resend API key for sending emails |
| `EMAIL_FROM` | No | `Resumakr <noreply@resumakr.us>` | Sender email address |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL for reset links |

---

## 4. Test Suite with Vitest

### Overview
Comprehensive test suite using Vitest for the backend API. Tests cover:
- Authentication (register, login, JWT, password reset)
- Resume CRUD operations
- Subscription plan management
- Admin authorization

### New Files Created

#### `backend/vitest.config.js`
**Purpose**: Vitest configuration

**Settings**:
```javascript
{
  test: {
    globals: true,           // Global describe, it, expect
    environment: 'node',     // Node.js environment
    coverage: {
      provider: 'v8',        // V8 coverage provider
      reporter: ['text', 'html'],
      exclude: ['node_modules/**', 'tests/**', '*.config.js']
    },
    include: ['tests/**/*.test.js'],
    testTimeout: 10000,      // 10 second timeout
    hookTimeout: 10000,
    setupFiles: ['./tests/setup.js']
  }
}
```

---

#### `backend/tests/setup.js`
**Purpose**: Test environment configuration

**Actions**:
1. Loads `.env` from `backend/.env`
2. Sets `NODE_ENV=test`
3. Sets `BCRYPT_ROUNDS=4` (faster hashing)
4. Silences `console.log` and `console.info` (unless `DEBUG=true`)
5. Keeps `console.error` and `console.warn` for debugging

---

#### `backend/tests/testApp.js`
**Purpose**: Express app factory for testing

**Creates app with**:
- CORS (all origins allowed)
- JSON body parser (10mb limit)
- URL-encoded parser (10mb limit)
- Express session (test secret)
- Passport initialization
- Routes: /api/auth, /api/resumes, /api/resume-data, /api/subscriptions, /api/payments
- Health check: GET /api/health
- Error handlers

**Export**: `createTestApp()` function

---

#### `backend/tests/auth.test.js`
**Purpose**: Authentication endpoint tests

**Test Count**: 19 tests

**Test Suites**:

| Suite | Tests |
|-------|-------|
| POST /api/auth/register | 4 tests |
| POST /api/auth/login | 4 tests |
| GET /api/auth/me | 4 tests |
| POST /api/auth/forgot-password | 3 tests |
| GET /api/auth/verify-reset-token/:token | 1 test |
| POST /api/auth/reset-password | 2 tests |
| Health Check | 1 test |

**Detailed Tests**:

**POST /api/auth/register**:
1. ✓ should register a new user with valid data
   - Expects: 201, token, user object, no password_hash
2. ✓ should reject duplicate email registration
   - Expects: 409 Conflict
3. ✓ should reject registration with invalid email
   - Expects: 400
4. ✓ should reject registration with weak password
   - Expects: 400

**POST /api/auth/login**:
1. ✓ should login with valid credentials
   - Expects: 200, token, user object
2. ✓ should reject login with wrong password
   - Expects: 401, error property
3. ✓ should reject login with non-existent email
   - Expects: 401
4. ✓ should reject login without email
   - Expects: 400

**GET /api/auth/me**:
1. ✓ should return current user with valid token
   - Expects: 200, user data, no password_hash
2. ✓ should reject request without token
   - Expects: 401
3. ✓ should reject request with invalid token
   - Expects: 401
4. ✓ should reject request with malformed Authorization header
   - Expects: 401

**POST /api/auth/forgot-password**:
1. ✓ should accept valid email for password reset
   - Expects: 200, message property
2. ✓ should return 200 even for non-existent email (security)
   - Expects: 200 (anti-enumeration)
3. ✓ should reject invalid email format
   - Expects: 400

**GET /api/auth/verify-reset-token/:token**:
1. ✓ should return valid=false for invalid/expired token
   - Expects: 200, valid=false, error property

**POST /api/auth/reset-password**:
1. ✓ should reject reset with invalid token
   - Expects: 400, error property
2. ✓ should reject reset with weak password
   - Expects: 400

**Health Check**:
1. ✓ should return healthy status
   - Expects: 200, status='healthy', timestamp

**Cleanup**: Deletes test user and password reset tokens in `afterAll`

---

#### `backend/tests/resumes.test.js`
**Purpose**: Resume CRUD endpoint tests

**Test Count**: 15 tests

**Setup**: Creates subscribed test user in `beforeAll`

**Test Suites**:

| Suite | Tests |
|-------|-------|
| POST /api/resumes | 5 tests |
| GET /api/resumes | 2 tests |
| GET /api/resumes/:id | 3 tests |
| PUT /api/resumes/:id | 3 tests |
| DELETE /api/resumes/:id | 2 tests |

**Detailed Tests**:

**POST /api/resumes**:
1. ✓ should create a new resume
   - Expects: 201, id, title='Test Resume', source_type='manual', status='draft'
2. ✓ should reject resume creation without auth
   - Expects: 401
3. ✓ should reject resume with missing title
   - Expects: 400
4. ✓ should reject resume with invalid source_type
   - Expects: 400
5. ✓ should reject resume creation without subscription
   - Creates unsubscribed user, expects: 403

**GET /api/resumes**:
1. ✓ should list user resumes
   - Expects: 200, array with id and title
2. ✓ should reject listing without auth
   - Expects: 401

**GET /api/resumes/:id**:
1. ✓ should get a specific resume
   - Expects: 200, matching id and title
2. ✓ should return 404 for non-existent resume
   - Expects: 404 for UUID `00000000-0000-0000-0000-000000000000`
3. ✓ should reject access to other user's resume (403 - needs subscription)
   - Creates another user, expects: 403 (subscription check before ownership check)

**PUT /api/resumes/:id**:
1. ✓ should update resume title
   - Expects: 200, title='Updated Resume Title'
2. ✓ should update resume status to active
   - Expects: 200, status='active'
3. ✓ should reject invalid status value
   - Expects: 400 for status='invalid-status'

**DELETE /api/resumes/:id**:
1. ✓ should delete a resume
   - Expects: 200, then 404 on get
2. ✓ should return 404 for non-existent resume delete
   - Expects: 404

**Cleanup**: Deletes all test resumes and user in `afterAll`

---

#### `backend/tests/subscriptions.test.js`
**Purpose**: Subscription plan endpoint tests

**Test Count**: 6 tests

**Setup**: Creates regular user and admin user in `beforeAll`

**Test Suites**:

| Suite | Tests |
|-------|-------|
| GET /api/subscriptions/plans | 2 tests |
| POST /api/subscriptions/plans (Admin) | 4 tests |

**Detailed Tests**:

**GET /api/subscriptions/plans**:
1. ✓ should list subscription plans (public)
   - Expects: 200, array
2. ✓ should include required plan fields
   - Expects: plan_id, name, price, duration, period

**POST /api/subscriptions/plans (Admin)**:
1. ✓ should require authentication to create plan
   - Expects: 401
2. ✓ should require admin to create plan
   - Regular user expects: 403
3. ✓ should allow admin to create plan
   - Admin expects: 201, id, plan_id, name
4. ✓ should reject duplicate plan_id
   - Expects: 409 for existing 'daily' plan

**Cleanup**: Deletes test plans and users in `afterAll`

---

### Package.json Changes

#### `backend/package.json`

**New Scripts**:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**New devDependencies**:
```json
{
  "@vitest/coverage-v8": "^4.0.17",
  "supertest": "^7.2.2",
  "vitest": "^4.0.17"
}
```

---

### Test Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Coverage Report

Last run coverage:

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| validators/schemas.js | 92.59% | 66.66% | 42.85% | 92.59% |
| routes/resumes.js | 77.27% | 72.72% | 100% | 77.27% |
| config/database.js | 88.23% | 50% | 66.66% | 88.23% |
| middleware/auth.js | 64.1% | 55% | 75% | 64.1% |
| routes/auth.js | 49% | 44.64% | 33.33% | 49% |

---

## Files Summary

### New Files (13)

| File | Purpose |
|------|---------|
| `backend/src/validators/schemas.js` | Zod validation schemas |
| `backend/src/middleware/validate.js` | Validation middleware |
| `backend/src/utils/logger.js` | Winston logger configuration |
| `backend/src/middleware/requestId.js` | Request ID and HTTP logging middleware |
| `backend/src/services/email.js` | Resend email service |
| `backend/migrations/008_password_reset.sql` | Password reset tokens table |
| `backend/vitest.config.js` | Vitest configuration |
| `backend/tests/setup.js` | Test environment setup |
| `backend/tests/testApp.js` | Test app factory |
| `backend/tests/auth.test.js` | Auth endpoint tests |
| `backend/tests/resumes.test.js` | Resume endpoint tests |
| `backend/tests/subscriptions.test.js` | Subscription endpoint tests |
| `frontend/src/pages/ForgotPassword.jsx` | Forgot password page |
| `frontend/src/pages/ResetPassword.jsx` | Reset password page |

### Modified Files (7)

| File | Changes |
|------|---------|
| `backend/src/routes/auth.js` | Added validation, logging, password reset endpoints |
| `backend/src/routes/resumes.js` | Added validation with uuidParamSchema |
| `backend/src/routes/coupons.js` | Added validation |
| `backend/src/server.js` | Added request ID and HTTP logging middleware |
| `backend/package.json` | Added dependencies and test scripts |
| `frontend/src/pages/index.jsx` | Added password reset routes |
| `frontend/src/api/apiClient.js` | Added password reset API methods |

---

## Environment Variables Summary

| Variable | Feature | Required | Default |
|----------|---------|----------|---------|
| `RESEND_API_KEY` | Password Reset | Production | - |
| `EMAIL_FROM` | Password Reset | No | `Resumakr <noreply@resumakr.us>` |
| `FRONTEND_URL` | Password Reset | No | `http://localhost:5173` |
| `LOG_LEVEL` | Logging | No | `info` (prod) / `debug` (dev) |
| `LOG_TO_FILE` | Logging | No | `false` |
| `LOGS_DIR` | Logging | No | `backend/logs` |

---

## API Endpoints Added

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/forgot-password | No | Request password reset email |
| GET | /api/auth/verify-reset-token/:token | No | Verify reset token validity |
| POST | /api/auth/reset-password | No | Reset password with token |

---

## Security Considerations

1. **Password Reset Anti-Enumeration**: Always returns success message regardless of whether email exists
2. **Token Security**: 32-byte cryptographically random tokens (64 hex chars)
3. **Token Expiration**: 1-hour expiration enforced at database level
4. **Token Invalidation**: All existing tokens invalidated when new one created or password reset
5. **Email Masking**: Token verification returns masked email (j***@example.com)
6. **XSS Prevention**: All user input sanitized via Zod schemas and HTML entity encoding
7. **Input Validation**: All endpoints validate input before processing
8. **Logging**: Sensitive data (passwords, tokens) never logged

---

## Migration Notes

1. Run `npm run migrate` in backend to create `password_reset_tokens` table
2. Set `RESEND_API_KEY` in Railway environment variables for production email
3. Set `FRONTEND_URL` to production frontend URL in Railway
4. Test suite requires local database (Docker) to run
