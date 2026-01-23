# Codebase Analysis - Resumakr Resume Builder

**Analysis Date**: January 16, 2026
**Analyzed By**: Claude Code

---

## Executive Summary

Resumakr is a full-stack SaaS resume builder with AI-powered features, built as a monorepo with:
- **Backend**: Node.js/Express API (2,926 lines of code across 16 routes)
- **Frontend**: React 18 + Vite with 83 components
- **Database**: PostgreSQL with migration-based schema management
- **Authentication**: JWT + OAuth (Google, Microsoft, GitHub, Apple)
- **Monetization**: Stripe integration with subscription-based paywall

---

## 1. Directory Structure

```
resumakr-for-claude/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── server.js       # Entry point with middleware stack
│   │   ├── config/         # Database and Passport OAuth config
│   │   ├── middleware/     # Auth, error handling
│   │   ├── routes/         # 16 API endpoint modules
│   │   └── services/       # Stripe payment service
│   ├── migrations/         # SQL migration files (7 total)
│   └── package.json
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── main.jsx       # Vite entry point
│   │   ├── App.jsx        # Root component with QueryClient
│   │   ├── pages/         # Route-based pages (27 pages)
│   │   ├── components/    # 83 reusable React components
│   │   ├── api/           # API client configuration
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React context for state
│   │   ├── utils/         # Helper functions
│   │   └── lib/           # Utility libraries
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docker-compose.yml     # PostgreSQL container only
├── .env.example          # Environment template
├── README.md             # Project documentation
├── CLAUDE.md             # Claude-specific instructions
└── DEVELOPMENT_LOG.md    # Recent changes and implementation status
```

---

## 2. Backend Architecture

### Entry Point: `backend/src/server.js`

The Express server implements a sophisticated middleware stack:

- **Security**: Helmet.js with CSP disabled for iframe embedding
- **CORS**: Configured for frontend URL (localhost:5173 in dev)
- **Rate Limiting**: 15-minute windows, 100 requests max (configurable)
- **Session Management**: Express-session for OAuth flow
- **Trust Proxy**: Critical for rate limiting behind reverse proxies
- **Webhook Handling**: Raw body parsing for Stripe webhook signature verification

Key configuration:
```javascript
app.set('trust proxy', 1)  // Essential for production behind nginx
app.use(helmet({ contentSecurityPolicy: false }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))
```

### Database Layer: PostgreSQL with Connection Pooling

**Config**: `backend/src/config/database.js`

- Pool-based connection management (max 20 connections)
- Query logging with duration tracking
- SSL support for production
- Error handling with process exit on fatal errors

### Database Migrations (7 files)

Migrations run sequentially via `backend/migrations/run.js`:

1. **001_initial_schema.sql** - Users, resumes, resume_data, versions, subscription_plans, ai_providers
2. **002_add_oauth_support.sql** - OAuth fields (oauth_provider, oauth_id, avatar_url)
3. **003_add_campaigns_and_settings.sql** - Marketing infrastructure
4. **004_add_subscription_tracking.sql** - Subscription end date tracking
5. **005_stripe_integration.sql** - Stripe columns, payments, subscription_events tables
6. **005_update_ai_providers_schema.sql** - Provider configuration updates
7. **007_update_provider_types.sql** - Support for multiple AI provider types

### Key Database Tables

**users**
- UUID primary key with default generation
- Email/password for local auth, OAuth fields for social login
- Subscription status with end date tracking
- Stripe customer/subscription IDs
- Payment method details (last4, brand)

**resumes**
- References user via created_by foreign key
- Status: draft/active/archived
- Source type: manual/uploaded
- Automatic timestamps (created_at, updated_at)

**resume_data**
- One-to-one relationship with resumes
- JSONB fields for flexible data storage:
  - personal_info, work_experience, education, skills, certifications
  - job_description, template configuration, cover letters
  - ai_metadata, ats_analysis_results

**subscription_plans**
- plan_id (unique), name, price, period (monthly/yearly)
- Features as JSONB array
- Stripe integration fields (stripe_product_id, stripe_price_id)

**payments & subscription_events**
- Track Stripe transaction history
- Event deduplication via stripe_event_id
- Webhook event status tracking

### API Routes (16 modules)

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/api/auth` | Registration, login, OAuth callbacks | Some |
| `/api/resumes` | CRUD operations | Yes, subscription |
| `/api/resume-data` | Resume content management | Yes, subscription |
| `/api/versions` | Version history | Yes, subscription |
| `/api/ai` | AI-powered features | Yes, subscription |
| `/api/upload` | File upload/parsing | Yes |
| `/api/subscriptions` | Plan management | Admin only |
| `/api/payments` | Payment records | Admin only |
| `/api/providers` | AI provider configuration | Admin only |
| `/api/prompts` | Custom AI prompts | Admin only |
| `/api/coupons` | Discount codes | Admin only |
| `/api/campaigns` | Marketing campaigns | Admin only |
| `/api/faq` | Help articles | Public |
| `/api/settings` | App configuration | Admin only |
| `/api/users` | User management | Admin only |
| `/api/webhooks` | Stripe webhook handler | Public (signature-verified) |

### Authentication & Authorization Middleware

**Location**: `backend/src/middleware/auth.js`

```javascript
authenticate      // Requires valid JWT, throws 401
requireAdmin      // Requires admin role, throws 403
requireSubscription // Checks is_subscribed + subscription_end_date validity
optionalAuth      // Sets req.user to null if missing token
```

### OAuth Configuration

**Passport.js Strategy**: `backend/src/config/passport.js`

Configured providers:
- Google OAuth 2.0
- Microsoft OAuth 2.0
- GitHub OAuth 2.0
- Apple OAuth (with private key authentication)

### Stripe Integration Service

**Location**: `backend/src/services/stripe.js`

Core functions:
- `getOrCreateCustomer()` - Creates Stripe customer, stores ID in database
- `createCheckoutSession()` - Initiates Stripe Checkout with subscription
- `handleSubscriptionCreated()` - Webhook processor
- `handleSubscriptionUpdated()` - Webhook processor
- `handleSubscriptionDeleted()` - Webhook processor
- `syncPlanToStripe()` - Two-way sync with Stripe products/prices

---

## 3. Frontend Architecture

### Build Stack

- **Vite** with path alias `@` → `./src`
- **Tailwind CSS** with dark mode support and custom theming
- **React Router v7** for client-side routing

### Routing Structure

**Location**: `frontend/src/pages/index.jsx`

```
Public Routes (no Layout):
  /login, /signup, /auth/callback

Protected Routes (with Layout sidebar):
  /, /MyResumes, /BuildWizard, /ResumeReview, /UploadResume, /Pricing, /Help

Account Routes:
  /AccountSettings, /SubscriptionManagement, /subscription-success

Admin Routes:
  /SettingsProviders, /SettingsPrompts, /SettingsPlans, /SettingsCodes,
  /SettingsCampaigns, /SettingsHelp, /SettingsInterface, /SettingsUsers
```

### API Client Architecture

**Location**: `frontend/src/api/apiClient.js`

- Axios-based with automatic JWT injection
- Auto-redirect on 401 errors
- Token stored in localStorage as `resumakr_token`

**Organization**:
```javascript
api.auth              // register, login, me, updateMe, isAuthenticated, logout
api.entities.Resume   // list, filter, get, create, update, delete
api.entities.ResumeData
api.entities.ResumeVersion
api.entities.SubscriptionPlan
api.entities.AIProvider
api.entities.CustomPrompt
api.entities.CouponCode
api.entities.Campaign
api.entities.FAQ
api.entities.User
api.entities.Payment
api.entities.Settings
api.integrations.stripe    // createCheckoutSession
api.functions.upload       // uploadFile, parseResume, extractText
```

### Component Organization (83 components)

- **Resume Components** (`components/resume/`) - Template, sections, modals
- **UI Components** (`components/ui/`) - Radix UI primitives, shadcn/ui
- **Admin Components** (`components/admin/`) - Provider, prompt, user management
- **Wizard Components** - Step-by-step builder

### State Management

- React Hooks + TanStack React Query
- 5-minute cache, single retry, no refetch on window focus

---

## 4. Technology Stack

### Backend Dependencies

| Category | Package |
|----------|---------|
| Web Framework | express 4.18.2 |
| Database | pg 8.11.0 |
| Authentication | jsonwebtoken 9.0.0, passport 0.7.0 |
| Payments | stripe 20.1.0 |
| File Handling | multer 1.4.5, pdf-parse 1.1.1, mammoth 1.6.0 |
| Security | helmet 7.0.0, cors 2.8.5, express-rate-limit 6.7.0 |
| AI | openai 4.0.0, @google/generative-ai 0.24.1 |

### Frontend Dependencies

| Category | Package |
|----------|---------|
| UI Framework | react 18.2.0, react-dom 18.2.0 |
| Routing | react-router-dom 7.2.0 |
| Components | @radix-ui/* (15+ packages), lucide-react 0.475.0 |
| Styling | tailwindcss 3.4.17, next-themes 0.4.4 |
| Data Fetching | @tanstack/react-query 5.90.10, axios 1.13.2 |
| Payments | @stripe/stripe-js 8.6.0, @stripe/react-stripe-js 5.4.1 |
| Forms | react-hook-form 7.66.1, zod 3.24.2 |
| Build | vite 6.1.0 |

---

## 5. Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Token signing secret (min 32 bytes) |
| `SESSION_SECRET` | Express session encryption |
| `FRONTEND_URL` | CORS and OAuth redirects |
| `BACKEND_URL` | OAuth callback URLs |
| `DATABASE_URL` | PostgreSQL connection string |

### OAuth (Optional)

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`

### Stripe

- `STRIPE_SECRET_KEY` - Server-side
- `STRIPE_PUBLISHABLE_KEY` - Client-side
- `STRIPE_WEBHOOK_SECRET` - Webhook verification
- `VITE_STRIPE_PUBLISHABLE_KEY` - Frontend build

### AI

- `OPENAI_API_KEY` - Required for AI features

---

## 6. Key Implementation Patterns

### Authentication Flow

1. Local Auth: Email/password → bcrypt → JWT token
2. OAuth: Provider redirect → Passport → Find/create user → JWT
3. Token Storage: localStorage (`resumakr_token`)
4. Auto-injection: Axios interceptor adds Bearer header

### Subscription Enforcement

```javascript
router.use(authenticate)
router.use(requireSubscription)
// Checks: is_subscribed === true AND subscription_end_date > NOW()
```

### File Upload & Parsing

1. Multer disk storage with random filenames
2. File validation (.pdf, .docx, .doc, 10MB limit)
3. Text extraction via pdf-parse or mammoth
4. Optional AI content improvement

### AI Provider Abstraction

Supports: OpenAI, OpenRouter, Groq, Perplexity, DeepSeek, Mistral, Google Gemini

---

## 7. Known Issues & Areas for Improvement

### Critical

1. **No Test Suite** - No `.test.js` or `.spec.js` files found
2. **No Password Reset** - Users cannot recover forgotten passwords
3. **Local File Storage** - Not scalable for multi-instance deployments

### Performance

4. **Subscription Check Per Request** - Could cache in JWT
5. **AI Client Recreation** - New instance per request, no pooling

### Security

6. **Webhook Race Condition** - Needs `SELECT FOR UPDATE` for deduplication
7. **OAuth Account Linking** - Could be exploited with spoofed emails

### Code Quality

8. **Minimal Error Handler** - Only 7 lines, limited context
9. **No Input Validation** - No zod/joi on route inputs
10. **Console.log Logging** - No structured logging

---

## 8. File Reference Quick Guide

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Express app + middleware |
| `backend/src/config/database.js` | PostgreSQL connection pool |
| `backend/src/config/passport.js` | OAuth strategy configuration |
| `backend/src/middleware/auth.js` | Authentication & authorization |
| `backend/src/routes/resumes.js` | Resume CRUD |
| `backend/src/routes/subscriptions.js` | Plan management & Stripe sync |
| `backend/src/routes/webhooks.js` | Stripe webhook handler |
| `backend/src/services/stripe.js` | Stripe integration service |
| `frontend/src/pages/index.jsx` | Routing configuration |
| `frontend/src/pages/Layout.jsx` | Sidebar navigation |
| `frontend/src/api/apiClient.js` | Axios client & API methods |

---

## 9. Development Commands

### Backend (from `backend/`)
```bash
npm install
npm run dev          # Nodemon auto-reload
npm run migrate      # Run SQL migrations
npm run create-admin # Create admin user
```

### Frontend (from `frontend/`)
```bash
npm install
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production bundle
```

### Docker
```bash
docker-compose up -d   # Start PostgreSQL
docker-compose down    # Stop PostgreSQL
```
