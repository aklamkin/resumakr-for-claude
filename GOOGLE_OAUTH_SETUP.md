# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for Resumakr.

## Overview

Resumakr has Google OAuth fully implemented and ready to use. You just need to configure your Google Cloud credentials.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter project name: "Resumakr" (or your preferred name)
5. Click "Create"

## Step 2: Enable Google+ API

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Resumakr
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. On "Scopes" screen, click **Save and Continue** (we'll use default scopes)
7. On "Test users" screen (if in testing mode):
   - Add your email and any test users
   - Click **Save and Continue**
8. Review and click **Back to Dashboard**

## Step 4: Create OAuth Client ID

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Configure the client:

   **Name**: Resumakr Web Client

   **Authorized JavaScript origins**:
   - `http://localhost:5173` (development)
   - `http://localhost:3001` (development)
   - `https://yourdomain.com` (production, when deployed)

   **Authorized redirect URIs**:
   - `http://localhost:3001/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)

5. Click **Create**

## Step 5: Copy Credentials

After creating, you'll see a dialog with:
- **Client ID**: Something like `123456789-abcdefg.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abc123def456`

**Copy both values** - you'll need them in the next step.

## Step 6: Configure Environment Variables

1. Open `backend/.env` file
2. Replace the placeholder values:

```bash
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

3. Save the file

## Step 7: Restart Backend Container

The backend needs to be restarted to pick up the new environment variables:

```bash
docker-compose restart backend
```

## Step 8: Test Google OAuth

1. Go to `http://localhost:5173/login`
2. Click the **Google** button
3. You should be redirected to Google's login page
4. After signing in with Google, you'll be redirected back to Resumakr
5. You should be logged in automatically

## How It Works

### Authentication Flow

1. User clicks "Continue with Google" button on login/signup page
2. Frontend redirects to: `http://localhost:3001/api/auth/google`
3. Backend redirects to Google's OAuth consent screen
4. User approves and Google redirects to: `http://localhost:3001/api/auth/google/callback`
5. Backend receives OAuth token, creates/finds user, generates JWT
6. Backend redirects to: `http://localhost:5173/auth/callback?token=JWT_TOKEN`
7. Frontend stores JWT in localStorage and redirects to home page

### User Account Linking

The system intelligently handles different scenarios:

- **New Google user**: Creates a new account with Google profile info
- **Existing email**: Links Google OAuth to your existing account
- **OAuth-only users**: Can sign in without a password

### Security Features

- JWT tokens expire in 7 days (configurable via `JWT_EXPIRES_IN`)
- Session cookies are HTTP-only in production
- CORS configured to allow only your frontend URL
- OAuth state parameter prevents CSRF attacks

## Production Deployment

When deploying to production:

1. Update authorized origins and redirect URIs in Google Cloud Console
2. Update environment variables:
   ```bash
   FRONTEND_URL=https://yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   NODE_ENV=production
   ```
3. Ensure HTTPS is enabled (required for secure cookies)
4. Consider publishing your OAuth app (remove "Testing" status) in Google Cloud Console

## Troubleshooting

### "Redirect URI mismatch" error

- Verify the redirect URI in Google Cloud Console exactly matches: `http://localhost:3001/api/auth/google/callback`
- Check that `BACKEND_URL` in `.env` is correct

### "Access blocked: This app's request is invalid"

- Make sure Google+ API is enabled
- Check OAuth consent screen is properly configured
- Ensure your email is added as a test user (if app is in testing mode)

### User not created after OAuth

- Check backend logs: `docker-compose logs backend`
- Verify `DATABASE_URL` is correct
- Ensure OAuth migration has been run

### Token not being stored

- Check browser console for errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check CORS settings in `backend/src/server.js`

## Additional OAuth Providers

Resumakr also supports:
- **Microsoft**: See `.env.example` for configuration
- **GitHub**: See `.env.example` for configuration
- **Apple**: See `.env.example` for configuration

Each provider follows the same setup pattern - just get credentials and add to `.env`.

## Support

For issues with Google OAuth setup, check:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google OAuth Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
