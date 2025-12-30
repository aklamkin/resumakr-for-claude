# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 IMPORTANT: Recent Development (Dec 30, 2025)

**Major features implemented since Nov 28, 2024:**
- ✅ Google OAuth authentication (configured)
- ✅ Complete Stripe payment integration (backend + frontend)
- ✅ Subscription-required paywall protection
- ✅ Webhook event processing
- ✅ Test discount code: `TESTFREE` (100% off)

**📖 Full details in:** `DEVELOPMENT_LOG.md`

**⏳ Remaining tasks:**
- Frontend paywall UI components (upgrade prompts, subscription status)
- End-to-end testing with Stripe test cards

**🔑 Quick context:**
- All resume operations now require active subscription
- Marketing campaigns can provide free trial periods
- Stripe Checkout handles all payment processing
- Webhooks at `/api/webhooks/stripe` process subscription events

---

## Project Overview

Resumakr is a full-stack SaaS resume builder application with AI-powered features. Originally built on Base44, it has been migrated to a standalone architecture with PostgreSQL database and Express backend.

**Architecture**: Monorepo with separate backend (Node.js/Express) and frontend (React/Vite)

## Development Commands

### Backend (from `backend/` directory)

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run in production mode
npm start

# Database operations
npm run migrate              # Run database migrations
npm run seed                 # Seed database with initial data
npm run create-admin         # Create an admin user (interactive)
```

### Frontend (from `frontend/` directory)

```bash
# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Docker Deployment

```bash
# Start all services (PostgreSQL, backend, frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Environment Configuration

The application requires environment variables. Copy `.env.example` to `.env` and configure:

- `DB_PASSWORD`: PostgreSQL database password
- `JWT_SECRET`: Secret key for JWT tokens (generate with `openssl rand -base64 32`)
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `DATABASE_URL`: PostgreSQL connection string (auto-configured in docker-compose)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)

Both `backend/.env` and root `.env` need to be configured for local development.

## Architecture & Key Patterns

### Backend Structure

**Entry Point**: `backend/src/server.js` - Express server with middleware stack (helmet, CORS, rate limiting, compression)

**Database Layer**:
- PostgreSQL accessed via `pg` connection pool
- Database config: `backend/src/config/database.js`
- Single migration runner: `backend/migrations/run.js` (executes all `.sql` files in order)
- Schema: `backend/migrations/001_initial_schema.sql`

**API Routes** (all under `/api` prefix):
- `/auth` - User authentication (register, login, me)
- `/resumes` - Resume CRUD operations
- `/resume-data` - Resume content/data management
- `/versions` - Resume version history
- `/ai` - AI integration endpoints (requires subscription)
- `/upload` - File upload and parsing
- `/subscriptions` - Subscription plan management
- `/providers` - AI provider configuration (admin only)
- `/prompts` - Custom AI prompts (admin only)
- `/faq` - FAQ management
- `/coupons` - Coupon code management
- `/campaigns` - Marketing campaigns
- `/settings` - App settings (admin only)
- `/users` - User management (admin only)

**Authentication & Authorization**:
- JWT-based authentication via Bearer tokens
- Middleware in `backend/src/middleware/auth.js`:
  - `authenticate` - Requires valid JWT, adds `req.user`
  - `requireAdmin` - Requires admin role
  - `requireSubscription` - Requires active subscription
  - `optionalAuth` - Optionally authenticates, sets `req.user` or null

**AI Integration**:
- Supports multiple AI providers (OpenAI by default)
- Configurable per-user or system-wide
- All AI endpoints require active subscription
- Provider management in database (`ai_providers` table)

### Frontend Structure

**Framework**: React 18 + Vite + React Router v7

**Entry Point**: `frontend/src/main.jsx` → `App.jsx` → `pages/index.jsx`

**Routing**: All routes defined in `frontend/src/pages/index.jsx`
- Uses `<Layout>` wrapper for authenticated pages
- Auth pages (Login/Signup) render without Layout
- Public pages: Home, Pricing, Help
- Protected pages: All resume builder and settings pages

**API Client**: `frontend/src/api/apiClient.js`
- Axios-based client with automatic JWT injection
- Auto-redirects to `/login` on 401 errors
- Organized by entities, integrations, and functions
- Token stored in localStorage as `resumakr_token`

**UI Components**:
- Radix UI primitives in `frontend/src/components/ui/`
- Custom components in `frontend/src/components/`
- Tailwind CSS + shadcn/ui design system

**Key Features**:
- Resume builder wizard with multi-step form (`BuildWizard.jsx`)
- Resume editor with live preview (`ResumeReview.jsx`)
- Version history and comparison
- AI-powered improvements (ATS analysis, content suggestions)
- Template customization with drag-and-drop
- File upload (PDF/DOCX parsing)

### Database Schema (Key Tables)

**users**: Authentication, subscription status, roles (user/admin)

**resumes**: Resume metadata (title, status, source_type, created_by)

**resume_data**: All resume content as JSONB fields
- `personal_info`, `work_experience`, `education`, `skills`, `certifications`
- `job_description`, `template_id`, cover letters
- `ai_metadata`, `ats_analysis_results`

**resume_versions**: Version control for resume snapshots

**subscription_plans**: Pricing tiers and features

**ai_providers**: AI provider configuration (API keys, models)

**custom_prompts**: Admin-configurable AI prompts

**coupon_codes**, **marketing_campaigns**: Monetization features

**faq_items**, **help_config**: Help system

**app_settings**: Key-value configuration store

### Important Implementation Details

**Trust Proxy**: Backend sets `app.set('trust proxy', 1)` - critical for rate limiting behind nginx/proxies

**Error Handling**:
- Global error handlers in `server.js` for uncaught exceptions/rejections
- Custom error middleware in `middleware/errorHandler.js`
- All errors logged, don't crash server

**File Uploads**:
- Handled by multer middleware
- Supports PDF and DOCX parsing (pdf-parse, mammoth)
- Files stored in `uploads/` directory (configurable via `UPLOAD_DIR`)

**CORS Configuration**:
- Frontend URL must be set in `FRONTEND_URL` env var
- Credentials enabled for cookie/auth headers

**Subscription System**:
- Users have `is_subscribed` boolean and `subscription_end_date`
- Subscription checked on protected endpoints
- Automatic expiration check in `requireSubscription` middleware

**AI Provider Pattern**:
- Abstract provider interface supports multiple AI services
- Currently implements OpenAI
- Providers stored in database with API keys
- Each request can specify provider or use default

## Key Workflows

### Creating a New API Endpoint

1. Create route handler in `backend/src/routes/<entity>.js`
2. Add appropriate middleware (`authenticate`, `requireAdmin`, etc.)
3. Use `query()` helper from `database.js` for DB operations
4. Add endpoint to `apiClient.js` under appropriate section
5. Call from React components

### Adding a New Database Table

1. Create SQL migration file: `backend/migrations/00X_description.sql`
2. Migrations run in alphabetical order via `npm run migrate`
3. Update relevant route handlers and API client

### Implementing New AI Features

1. AI endpoints require `authenticate` + `requireSubscription` middleware
2. Use `getActiveProviders()` to fetch available AI providers
3. Create OpenAI client with provider API key
4. Handle response and update database as needed
5. Consider storing AI metadata in `ai_metadata` JSONB field

### Admin Features

- Protected by `requireAdmin` middleware
- Admin role set in users table
- Create admin via `npm run create-admin` script
- Admin pages: Settings*, Users, Providers, Prompts, Plans, Coupons

## Migration History

This project was migrated from Base44 (BaaS platform) to a standalone application. Several migration scripts exist in the root directory but are no longer needed for daily development. The current architecture uses:
- PostgreSQL instead of Base44's managed database
- Custom Express API instead of Base44 SDK
- Standard JWT authentication instead of Base44 auth