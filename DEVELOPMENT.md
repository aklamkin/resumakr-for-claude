# Local Development Guide

This guide explains how to run Resumakr locally. The local setup mirrors the production architecture on Railway (Nixpacks) for easier troubleshooting and dev-prod parity.

## Architecture

**Production (Railway):**
- PostgreSQL: Railway managed database
- Backend: Node.js app (Nixpacks)
- Frontend: Vite/Node.js app (Nixpacks)

**Local Development:**
- PostgreSQL: Docker container
- Backend: Native Node.js (`npm run dev`)
- Frontend: Native Vite dev server (`npm run dev`)

## Prerequisites

- Node.js 18+ (production uses Node 18)
- Docker Desktop (for PostgreSQL only)
- npm 9+

## Initial Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start PostgreSQL

```bash
# From project root
docker-compose up -d
```

This starts only PostgreSQL on port 5432.

### 3. Run Database Migrations

```bash
cd backend
node migrations/run.js
```

This creates all necessary tables in your local database.

### 4. (Optional) Seed Database

```bash
cd backend
npm run seed  # If you have a seed script
```

## Running the Application

You'll need **three terminal windows**:

### Terminal 1: PostgreSQL (already running)
```bash
docker-compose up -d
# Check status: docker-compose ps
```

### Terminal 2: Backend
```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001` with auto-reload via nodemon.

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173` with Vite hot module replacement.

## Environment Variables

### Backend: `backend/.env`
- Points to local PostgreSQL (`localhost:5432`)
- Uses local upload directory (`./uploads`)
- Configured for local development

### Frontend: `frontend/.env.local`
- Points to local backend (`http://localhost:3001/api`)
- Auto-loaded by Vite in development mode
- **Not committed to git** (in .gitignore)

### Frontend: `frontend/.env.production`
- Points to production backend (`https://api.resumakr.us/api`)
- Used during production builds
- **Committed to git**

## Stopping the Application

```bash
# Stop backend and frontend: Ctrl+C in each terminal

# Stop PostgreSQL
docker-compose down

# Stop PostgreSQL and remove data (clean slate)
docker-compose down -v
```

## Database Management

### View PostgreSQL Logs
```bash
docker-compose logs -f postgres
```

### Connect to PostgreSQL CLI
```bash
docker exec -it resumakr-db psql -U resumakr_user -d resumakr
```

### Reset Database
```bash
docker-compose down -v  # Removes data
docker-compose up -d    # Starts fresh
cd backend && node migrations/run.js  # Re-run migrations
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in `backend/.env` points to `localhost:5432`
- Check port 3001 is not in use: `lsof -i :3001`

### Frontend blank page
- Check backend is running and accessible at `http://localhost:3001/api/health`
- Check `frontend/.env.local` has correct VITE_API_URL
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors

### Database connection error
- Ensure PostgreSQL container is running: `docker-compose ps`
- Check password in `.env` matches `docker-compose.yml`
- Wait 10 seconds after starting PostgreSQL (healthcheck needs time)

### Port conflicts
- PostgreSQL (5432): Change port in `docker-compose.yml` if needed
- Backend (3001): Change PORT in `backend/.env`
- Frontend (5173): Change in Vite config or use `npm run dev -- --port 3000`

## VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

## Production Testing Locally

To test the production build locally:

```bash
# Frontend
cd frontend
npm run build
npm run preview  # Serves production build on http://localhost:4173

# Backend (already uses production-like setup)
cd backend
NODE_ENV=production npm start
```

## Differences from Production

| Aspect | Local | Production (Railway) |
|--------|-------|---------------------|
| Database | Docker PostgreSQL | Railway PostgreSQL |
| Backend Build | None (runs src directly) | Nixpacks build |
| Frontend Build | Vite dev server | Vite production build |
| HTTPS | No | Yes (automatic) |
| Domain | localhost | api.resumakr.us / app.resumakr.us |

## Next Steps

- See `RAILWAY_DEPLOYMENT.md` for production deployment guide
- See `README.md` for project overview
- See `CLAUDE.md` for Claude Code development notes
