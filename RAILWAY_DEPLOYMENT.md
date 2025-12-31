# Deploy Resumakr to Railway (Full Stack)

This guide shows you how to deploy **both frontend and backend** to Railway on a single platform.

**Cost:** ~$5-10/month
**Time:** ~20-30 minutes

> **Note:** This guide uses placeholder values for API keys and secrets. Replace them with your actual values from:
> - Google OAuth: Check `backend/.env` for your actual `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
> - Stripe: Check `backend/.env` for your actual Stripe test keys
> - OpenAI: Check `backend/.env` for your actual `OPENAI_API_KEY`
> - JWT/Session secrets: Use the values from `backend/.env` or generate new ones with `openssl rand -base64 32`

---

## Architecture

```
Railway Platform
├── Backend Service (Express API)
├── Frontend Service (Static Vite build)
└── PostgreSQL Database
```

Everything runs on Railway - simpler, cheaper, easier to manage.

---

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway to access your repositories

---

## Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `resumakr-for-claude` repository
4. Railway will create an initial service

---

## Step 3: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically creates a `DATABASE_URL` environment variable
4. The database is now linked to your services

---

## Step 4: Configure Backend Service

### 4a. Set Root Directory

1. Click on your backend service
2. Go to "Settings" tab
3. Scroll to "Root Directory"
4. Enter: `backend`
5. Save

### 4b. Configure Build

1. Still in Settings
2. Under "Build" section
3. Builder should auto-detect "Dockerfile"
4. Dockerfile Path: `backend/Dockerfile`

### 4c. Add Environment Variables

1. Go to "Variables" tab
2. Click "Raw Editor"
3. Paste the following:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=FUiErlWRmSkzmOzA7UbBTqbTpYN1h0+YQpFFzpdwMRs
SESSION_SECRET=FUiErlWRmSkzmOzA7UbBTqbTpYN1h0+YQpFFzpdwMRs
BCRYPT_ROUNDS=10

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Stripe (TEST MODE)
STRIPE_SECRET_KEY=your_stripe_test_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_test_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_will_update_after_webhook_setup

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# File Storage
FILE_STORAGE=local
UPLOAD_DIR=/app/uploads
```

**Note:** We'll add `FRONTEND_URL` and `BACKEND_URL` after we get the deployment URLs.

### 4d. Generate Domain

1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy your backend URL (e.g., `https://resumakr-backend-production-xxxx.up.railway.app`)
4. Save this URL - you'll need it

### 4e. Deploy Backend

Railway will automatically deploy. Wait for it to complete (check "Deployments" tab).

---

## Step 5: Add Frontend Service

### 5a. Add Another Service

1. In your Railway project, click "+ New"
2. Select "GitHub Repo" → Choose `resumakr-for-claude` again
3. This creates a second service for the frontend

### 5b. Configure Frontend Service

1. Click on the new frontend service
2. Go to "Settings"
3. Set "Service Name" to something like `resumakr-frontend`
4. Set "Root Directory" to: `frontend`

### 5c. Configure Build Command

1. Still in Settings
2. Under "Build" section:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -p $PORT`

### 5d. Add Frontend Environment Variables

1. Go to "Variables" tab
2. Add these variables:

```env
VITE_API_URL=https://your-backend-url.up.railway.app/api
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_test_publishable_key_here
```

**Replace** `https://your-backend-url.up.railway.app` with the actual backend URL from Step 4d.

### 5e. Install `serve` Package

The frontend needs `serve` to host the static files. We need to add it to `package.json`:

**Option 1: Add via Railway (recommended)**
1. Go to frontend service Settings
2. Under "Build", change Start Command to:
   ```bash
   npm install -g serve && serve -s dist -p $PORT
   ```

**Option 2: Add to package.json (I can do this)**
Let me know if you want me to add `serve` to your frontend `package.json` dependencies.

### 5f. Generate Frontend Domain

1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy your frontend URL (e.g., `https://resumakr-frontend-production-xxxx.up.railway.app`)
4. **This is your app URL!** Save it.

### 5g. Deploy Frontend

Railway will automatically build and deploy. Wait for completion.

---

## Step 6: Update Backend with Frontend URL

Now that you have your frontend URL, update the backend:

1. Go to backend service
2. Go to "Variables" tab
3. Add these two variables:

```env
FRONTEND_URL=https://resumakr-frontend-production-xxxx.up.railway.app
BACKEND_URL=https://resumakr-backend-production-xxxx.up.railway.app
```

**Replace** with your actual URLs from Steps 4d and 5f.

4. Railway will automatically redeploy the backend

---

## Step 7: Test Your Deployment

### Test Backend Health

```bash
curl https://your-backend-url.up.railway.app/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-12-31T..."}
```

### Test Frontend

1. Visit your frontend URL in a browser
2. You should see the Resumakr homepage
3. Check browser console for errors (should be none)

---

## Step 8: Update Google OAuth

Update your Google OAuth Console with production URLs:

1. Go to https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   - `https://your-backend-url.up.railway.app/api/auth/google/callback`
   - `https://your-frontend-url.up.railway.app/auth/callback`
4. Click "Save"

---

## Step 9: Set Up Stripe Webhooks

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. Endpoint URL: `https://your-backend-url.up.railway.app/api/webhooks/stripe`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Go to Railway backend service → Variables
8. Update `STRIPE_WEBHOOK_SECRET` with the actual secret
9. Railway will redeploy automatically

---

## Step 10: Create Stripe Products

### Option 1: Using Stripe CLI (Recommended)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Run the setup script
./setup-stripe-products.sh
```

This will output SQL UPDATE commands.

### Option 2: Manual Creation in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Create three products:
   - **Daily Plan:** $0.99/day
   - **Weekly Plan:** $6.49/week
   - **Monthly Plan:** $29.99/month
3. Note the Product IDs and Price IDs

### Update Database

Connect to your Railway PostgreSQL:

1. In Railway, click on PostgreSQL database
2. Go to "Connect" tab
3. Copy the connection URL or use "psql" command
4. Run the UPDATE commands from `setup-stripe-products.sh`:

```sql
UPDATE subscription_plans
SET stripe_product_id = 'prod_xxx', stripe_price_id = 'price_xxx'
WHERE plan_id = 'daily';

UPDATE subscription_plans
SET stripe_product_id = 'prod_yyy', stripe_price_id = 'price_yyy'
WHERE plan_id = 'weekly';

UPDATE subscription_plans
SET stripe_product_id = 'prod_zzz', stripe_price_id = 'price_zzz'
WHERE plan_id = 'monthly';
```

---

## Step 11: Test Complete Flow

Use the test checklist in `test-production-deployment.md`:

### Quick Test

1. **Visit your frontend URL**
2. **Sign up** for a new account
3. **Go to /pricing**
4. **Click "Subscribe Now"** on any plan
5. **Use Stripe test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`
6. **Complete checkout**
7. **Verify subscription active** - you should now have access to AI features

### Test Coupon Code

1. Create new account
2. Go to /pricing
3. Enter coupon code: `TESTFREE`
4. Complete checkout (should be $0.00)

---

## Troubleshooting

### Frontend shows "Cannot GET /"

**Fix:** Update frontend start command to:
```bash
npm install -g serve && serve -s dist -p $PORT
```

### Frontend shows "Failed to fetch"

**Check:**
1. Backend is running: `curl https://backend-url/api/health`
2. `VITE_API_URL` in frontend matches backend URL
3. `FRONTEND_URL` in backend matches frontend URL

### CORS errors in browser console

**Fix:**
1. Verify `FRONTEND_URL` in backend environment variables
2. Make sure it matches your actual frontend URL
3. Redeploy backend

### Database connection failed

**Check:**
1. PostgreSQL service is running in Railway
2. `DATABASE_URL` is automatically set
3. Backend can reach the database

### Webhook errors

**Check:**
1. Webhook URL in Stripe dashboard is correct
2. `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. Check Railway backend logs for webhook events

---

## Monitoring & Logs

### View Logs

**Backend logs:**
1. Click on backend service
2. Go to "Deployments" tab
3. Click on latest deployment
4. View logs in real-time

**Frontend logs:**
1. Same process for frontend service

### Check Database

1. Click on PostgreSQL service
2. Go to "Data" tab (if available)
3. Or connect via psql using connection URL

---

## Cost Management

Railway charges for:
- **Backend:** ~$3-5/month
- **Frontend:** ~$1-2/month
- **PostgreSQL:** ~$1-3/month
- **Total:** ~$5-10/month

**Free tier:** Railway provides $5 free credit per month, so you might pay $0-5 initially.

### Monitor Usage

1. Go to Railway dashboard
2. Check "Usage" section
3. Set up billing alerts if needed

---

## Next Steps

1. ✅ Deploy backend, frontend, database to Railway
2. ✅ Configure environment variables
3. ✅ Set up OAuth and Stripe
4. ✅ Create Stripe products
5. ✅ Test complete flow

### When Ready for Production

1. **Custom Domain:** Add your own domain to frontend service
2. **Live Stripe Keys:** Switch from test to live keys
3. **Monitoring:** Consider adding error tracking (Sentry, LogRocket)
4. **Backups:** Enable Railway automatic backups
5. **Scaling:** Railway auto-scales, but monitor performance

---

## Quick Reference

### Environment Variables Summary

**Backend:**
- `DATABASE_URL` - Auto-set by Railway
- `FRONTEND_URL` - Your frontend Railway URL
- `BACKEND_URL` - Your backend Railway URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe credentials
- `OPENAI_API_KEY` - AI features
- `JWT_SECRET`, `SESSION_SECRET` - Auth secrets

**Frontend:**
- `VITE_API_URL` - Backend URL + `/api`
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe public key

### Useful Commands

```bash
# Test backend health
curl https://your-backend.up.railway.app/api/health

# View Railway logs (requires Railway CLI)
railway logs

# Connect to PostgreSQL
railway connect postgres

# Create Stripe products
./setup-stripe-products.sh
```

---

**Need help?** Check `test-production-deployment.md` for detailed testing steps.
