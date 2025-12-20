# Resumakr

A full-stack SaaS resume builder application with AI-powered features for creating professional, ATS-optimized resumes.

## Features

- 🎨 **Modern Resume Builder** - Interactive drag-and-drop resume creation
- 🤖 **AI-Powered Improvements** - Get AI suggestions for resume content
- 📊 **ATS Analysis** - Check resume compatibility with Applicant Tracking Systems
- 🎯 **Multiple Templates** - Professional resume templates
- 📝 **Version History** - Track and revert resume changes
- 👥 **Multi-User Support** - User authentication and subscription management
- 🔧 **Admin Dashboard** - Manage users, AI providers, prompts, and settings
- 📤 **Export Options** - Download as PDF or DOCX
- 📋 **File Upload** - Import existing resumes from PDF/DOCX

## Tech Stack

**Frontend:**
- React 18 with Vite
- React Router v7
- Tailwind CSS + shadcn/ui
- Radix UI components
- Axios for API calls

**Backend:**
- Node.js + Express
- PostgreSQL database
- JWT authentication
- OpenAI & Google Gemini integration
- PDF/DOCX parsing

**Infrastructure:**
- Docker & Docker Compose
- Nginx (production)
- PostgreSQL 15

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (recommended) OR
- **Node.js** 18+ and **PostgreSQL** 15+
- **Git**

## Installation

### Option 1: Docker Installation (Recommended)

This is the easiest way to get started. All services run in containers.

1. **Clone the repository**
   ```bash
   git clone https://github.com/aklamkin/resumakr-for-claude.git
   cd resumakr-for-claude
   ```

2. **Configure environment variables**
   ```bash
   # Copy example files
   cp .env.example .env
   cp backend/.env.example backend/.env

   # Edit .env files with your values
   # At minimum, set:
   # - DB_PASSWORD (database password)
   # - JWT_SECRET (generate with: openssl rand -base64 32)
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker exec resumakr-api npm run migrate
   ```

5. **Create an admin user**
   ```bash
   docker exec -it resumakr-api npm run create-admin
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Option 2: Local Development Installation

If you prefer to run services locally without Docker:

1. **Clone the repository**
   ```bash
   git clone https://github.com/aklamkin/resumakr-for-claude.git
   cd resumakr-for-claude
   ```

2. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb resumakr

   # Or using psql:
   psql -U postgres
   CREATE DATABASE resumakr;
   \q
   ```

3. **Configure backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   npm install
   npm run migrate
   npm run create-admin
   ```

4. **Configure frontend**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Configuration

### Environment Variables

#### Root `.env` (for Docker)
```env
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_jwt_secret_here
DOMAIN=localhost
```

#### `backend/.env` (comprehensive)
See `backend/.env.example` for all available options. Key variables:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/resumakr
DB_PASSWORD=password

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# AI Providers (Optional - can configure in app)
OPENAI_API_KEY=sk-your-key
```

### AI Provider Setup

Resumakr supports multiple AI providers. Configure them through the admin dashboard:

1. Log in as admin
2. Navigate to Settings → AI Providers
3. Add provider:
   - **OpenAI**: Requires API key from https://platform.openai.com
   - **Google Gemini**: Requires API key from https://ai.google.dev
   - **OpenRouter**: Requires API key from https://openrouter.ai
   - **Groq**, **Perplexity**, **DeepSeek**, **Mistral**: Each requires their respective API keys

4. Set one provider as default
5. Optionally configure custom prompts in Settings → Prompts

## Database Migrations

The application uses SQL migrations in `backend/migrations/`:

```bash
# Run all migrations (Docker)
docker exec resumakr-api npm run migrate

# Run all migrations (Local)
cd backend
npm run migrate
```

Migrations are executed in order:
1. `001_initial_schema.sql` - Core tables (users, resumes, etc.)
2. `002_add_oauth_support.sql` - OAuth provider support
3. `003_add_campaigns_and_settings.sql` - Marketing & settings
4. `004_add_subscription_tracking.sql` - Subscription management
5. `005_update_ai_providers_schema.sql` - Enhanced AI provider fields
6. `006_add_custom_prompts_table.sql` - Custom AI prompts

## Admin User Management

### Create Admin User

```bash
# Interactive (Docker)
docker exec -it resumakr-api npm run create-admin

# Interactive (Local)
cd backend
npm run create-admin
```

Follow the prompts to enter email and password.

### Admin Dashboard Features

Access at `/settings` after logging in as admin:

- **Users** - View and manage all users
- **AI Providers** - Configure AI integrations
- **Prompts** - Create custom AI prompts
- **Plans** - Manage subscription tiers
- **Coupons** - Create discount codes
- **Settings** - App-wide configuration

## Usage

### Creating a Resume

1. **Sign up** or **log in** to your account
2. Click **"New Resume"** from dashboard
3. Choose **Build from Scratch** or **Upload Existing**
4. Fill in your information in the wizard
5. Review and edit with live preview
6. Use **AI Improve** buttons for AI-powered suggestions
7. Run **ATS Analysis** to optimize for job descriptions
8. Download as PDF or DOCX

### AI Features

**AI Improvement:**
- Click sparkle icon (✨) next to any section
- Get AI-generated alternatives
- Review and accept/reject suggestions
- Optimized for <9 second response time

**ATS Analysis:**
- Paste job description
- Run analysis to find missing keywords
- Get score and recommendations
- AI suggestions automatically incorporate relevant keywords

### Version History

- All changes are automatically saved
- Use **Undo** button to revert AI changes
- Access full version history from resume dashboard

## Development

### Project Structure

```
resumakr-for-claude/
├── backend/
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Auth, error handling
│   │   ├── config/        # Database, environment
│   │   └── server.js      # Express app entry
│   ├── migrations/        # SQL migration files
│   ├── scripts/           # Utility scripts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── pages/         # Route pages
│   │   └── main.jsx       # App entry
│   └── Dockerfile
├── docker-compose.yml     # Docker orchestration
├── CLAUDE.md             # Claude Code guidance
└── README.md             # This file
```

### API Documentation

All API endpoints are under `/api` prefix:

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/resumes` - List user's resumes
- `POST /api/resumes` - Create new resume
- `GET /api/resume-data/:id` - Get resume content
- `PUT /api/resume-data/:id` - Update resume
- `POST /api/ai/invoke` - Call AI provider
- `POST /api/ai/analyze-ats` - Run ATS analysis
- `GET /api/providers` - List AI providers (admin)
- `GET /api/prompts` - List custom prompts (admin)

See `backend/src/routes/` for complete API definitions.

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build all services
docker-compose build

# Or build individually
cd backend && npm run build
cd frontend && npm run build
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
docker exec resumakr-api npm run migrate
```

### AI Provider Errors

**"Rate limit exceeded"**
- Free tier limits reached (Gemini: 20 requests/day)
- Wait 24 hours or upgrade API key
- Add additional provider for failover

**"API key not configured"**
- Set API key in Settings → AI Providers
- Ensure provider is marked as active
- Check backend logs for detailed errors

### Frontend Not Loading

```bash
# Rebuild frontend container
docker-compose build frontend
docker-compose up -d frontend

# Check frontend logs
docker-compose logs frontend
```

### Backend Errors

```bash
# View backend logs
docker-compose logs backend -f

# Restart backend
docker-compose restart backend

# Check environment variables
docker exec resumakr-api env | grep -E "DATABASE|JWT|PORT"
```

## Production Deployment

### Docker Production

1. Update environment variables for production
2. Set `NODE_ENV=production`
3. Use strong passwords and secrets
4. Configure SSL/TLS termination (nginx/CloudFlare)
5. Set up database backups
6. Configure monitoring and logging

### Environment Checklist

- [ ] Strong `JWT_SECRET` generated
- [ ] Strong `DB_PASSWORD` set
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` set to production domain
- [ ] AI provider API keys configured
- [ ] Database backups scheduled
- [ ] SSL certificate installed
- [ ] Rate limiting configured
- [ ] Log rotation enabled

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

- Open an issue on GitHub
- Check existing issues for solutions
- Review CLAUDE.md for development guidance

## Acknowledgments

- Built with React, Express, and PostgreSQL
- UI components from shadcn/ui and Radix UI
- AI integration with OpenAI and Google Gemini
- Originally migrated from Base44 platform
