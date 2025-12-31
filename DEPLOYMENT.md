# Deployment Guide

This guide covers deploying Resumakr to production using Vercel (frontend) + Railway (backend).

---

## Architecture Overview

```
Frontend (Vercel)          Backend (Railway)         Database (Railway)
    React/Vite      --->   Express API       --->   PostgreSQL
    Static Site            Node.js Server            Managed DB
```

---

## Option 1: Vercel + Railway (Recommended)

### Step 1: Deploy Backend to Railway

1. **Go to:** https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Select:** `resumakr-for-claude`
6. **Click "Add variables"** and add:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate-new-secret>
SESSION_SECRET=<generate-new-secret>
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-backend.up.railway.app
BCRYPT_ROUNDS=10

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Stripe (use LIVE keys for production)
STRIPE_SECRET_KEY=<your-stripe-secret>
STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# OpenAI
OPENAI_API_KEY=<your-openai-key>
```

7. **Add PostgreSQL:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will auto-create `DATABASE_URL` variable

8. **Configure Root Directory:**
   - Go to Settings → Root Directory
   - Set to: `backend`

9. **Deploy!** Railway will build and deploy your backend

10. **Get your backend URL:**
    - Settings → Domains
    - Copy the Railway URL (e.g., `https://your-backend.up.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Go to:** https://vercel.com
2. **Sign up/Login** with GitHub
3. **Click "Add New Project"**
4. **Import** `resumakr-for-claude` repo
5. **Configure:**
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

6. **Add Environment Variables:**

```env
VITE_API_URL=https://your-backend.up.railway.app/api
VITE_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
```

7. **Deploy!** Vercel will build and deploy your frontend

8. **Get your frontend URL:**
   - Copy from Vercel dashboard (e.g., `https://your-app.vercel.app`)

### Step 3: Update Backend Environment

Go back to Railway and update:

```env
FRONTEND_URL=https://your-app.vercel.app
```

Redeploy the backend.

### Step 4: Configure OAuth Redirect URIs

Update Google OAuth Console:
- Authorized redirect URIs:
  - `https://your-backend.up.railway.app/api/auth/google/callback`
  - `https://your-app.vercel.app/auth/callback`

### Step 5: Configure Stripe Webhooks

1. **Go to:** https://dashboard.stripe.com/webhooks
2. **Add endpoint:**
   - URL: `https://your-backend.up.railway.app/api/webhooks/stripe`
   - Events: Select all `customer.subscription.*`, `payment_intent.succeeded`, `invoice.payment_succeeded`
3. **Copy webhook secret** and update Railway environment

### Step 6: Test!

Visit `https://your-app.vercel.app` and test:
- ✅ Login/Signup
- ✅ Google OAuth
- ✅ Subscribe to plan
- ✅ Stripe checkout
- ✅ Resume creation

---

## Option 2: Render (Full-Stack)

Render can host both frontend and backend in one place.

### Step 1: Create Blueprint

Create `render.yaml` in your repo:

```yaml
services:
  # Backend
  - type: web
    name: resumakr-backend
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: resumakr-db
          property: connectionString
      - key: FRONTEND_URL
        value: https://resumakr.onrender.com
      # Add all other env vars from .env.example

  # Frontend
  - type: web
    name: resumakr-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://resumakr-backend.onrender.com/api

# Database
databases:
  - name: resumakr-db
    databaseName: resumakr
    user: resumakr_user
```

### Step 2: Deploy

1. Go to https://render.com
2. Click "New Blueprint Instance"
3. Connect GitHub repo
4. Render will deploy everything automatically

---

## Option 3: DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repo
4. Configure:
   - Backend: Dockerfile in `backend/`
   - Frontend: Static site from `frontend/dist`
   - Database: Add PostgreSQL
5. Deploy

---

## Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] Backend API responds to `/api/health`
- [ ] Database migrations ran successfully
- [ ] Environment variables are all set
- [ ] Google OAuth redirects work
- [ ] Stripe checkout works
- [ ] Webhooks are receiving events
- [ ] CORS is configured correctly
- [ ] SSL/HTTPS is working

---

## Troubleshooting

### Frontend shows "Failed to fetch"

**Cause:** Backend URL not set correctly

**Fix:**
- Check `VITE_API_URL` in Vercel environment variables
- Redeploy frontend after changing

### Backend not receiving requests

**Cause:** CORS not configured

**Fix:**
- Verify `FRONTEND_URL` in backend environment
- Check backend logs for CORS errors

### OAuth redirect failing

**Cause:** Callback URL mismatch

**Fix:**
- Update Google OAuth Console authorized redirect URIs
- Ensure `BACKEND_URL` matches actual backend URL

### Database connection failed

**Cause:** `DATABASE_URL` not set

**Fix:**
- Railway: Auto-set when you add PostgreSQL
- Render: Check database connection string in dashboard
- Verify database is running and accessible

### Stripe webhooks not working

**Cause:** Webhook URL or secret incorrect

**Fix:**
- Verify webhook URL in Stripe dashboard
- Update `STRIPE_WEBHOOK_SECRET` environment variable
- Check backend logs for webhook errors

---

## Cost Estimates

### Railway + Vercel
- **Railway:** $5-10/month (backend + database)
- **Vercel:** Free (hobby tier)
- **Total:** ~$5-10/month

### Render
- **Web Services:** $7/month each × 2 = $14/month
- **PostgreSQL:** $7/month
- **Total:** ~$21/month

### DigitalOcean
- **App Platform:** $12/month (basic)
- **Managed Database:** $15/month
- **Total:** ~$27/month

---

## Quick Commands

### Generate secrets:
```bash
openssl rand -base64 32
```

### Check Railway logs:
```bash
railway logs
```

### Check Vercel logs:
```bash
vercel logs
```

### Test backend health:
```bash
curl https://your-backend.up.railway.app/api/health
```

---

**Recommended for beginners:** Railway + Vercel
**Best value:** Railway + Vercel
**Easiest all-in-one:** Render
