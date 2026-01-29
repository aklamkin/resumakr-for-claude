import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as GitHubStrategy } from 'passport-github2';
import AppleStrategy from '@nicokaiser/passport-apple';
import { query } from './database.js';
import jwt from 'jsonwebtoken';

// Helper function to find or create OAuth user
async function findOrCreateOAuthUser(provider, profileId, email, displayName, avatarUrl) {
  try {
    console.log(`[OAuth] Processing ${provider} login for ${email}`);

    // 1. Check if OAuth user already exists
    const existingOAuthUser = await query(
      'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
      [provider, profileId]
    );

    if (existingOAuthUser.rows.length > 0) {
      const user = existingOAuthUser.rows[0];
      console.log(`[OAuth] Found existing ${provider} user: ${user.email}`);

      // Update avatar_url and last_login
      await query(
        'UPDATE users SET avatar_url = $1, last_login = NOW(), updated_at = NOW() WHERE id = $2',
        [avatarUrl, user.id]
      );

      return { ...user, avatar_url: avatarUrl };
    }

    // 2. Check if user with this email exists (for account linking)
    if (email) {
      const existingEmailUser = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (existingEmailUser.rows.length > 0) {
        const user = existingEmailUser.rows[0];
        console.log(`[OAuth] Linking ${provider} to existing account: ${user.email}`);

        // Link OAuth to existing account
        await query(
          'UPDATE users SET oauth_provider = $1, oauth_id = $2, avatar_url = $3, last_login = NOW(), updated_at = NOW() WHERE id = $4',
          [provider, profileId, avatarUrl, user.id]
        );

        return { ...user, oauth_provider: provider, oauth_id: profileId, avatar_url: avatarUrl };
      }
    }

    // 3. Create new OAuth-only user with freemium tier defaults
    console.log(`[OAuth] Creating new ${provider} user: ${email}`);

    const result = await query(
      `INSERT INTO users (email, full_name, oauth_provider, oauth_id, avatar_url, role, is_subscribed, last_login, user_tier, tier_updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())
       RETURNING *`,
      [email || `${provider}_${profileId}@oauth.local`, displayName || '', provider, profileId, avatarUrl, 'user', false, 'free']
    );

    const newUser = result.rows[0];
    console.log(`[OAuth] Created new user with ID: ${newUser.id}`);

    return newUser;
  } catch (error) {
    console.error(`[OAuth] Error in findOrCreateOAuthUser:`, error);
    throw error;
  }
}

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`,
        scope: ['profile', 'email'],
        // Force account selection every time to prevent caching
        prompt: 'select_account'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const displayName = profile.displayName || '';
          const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          const user = await findOrCreateOAuthUser('google', profile.id, email, displayName, avatarUrl);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('[OAuth] Google strategy configured');
}

// Configure Microsoft OAuth Strategy
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/microsoft/callback`,
        scope: ['user.read']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const displayName = profile.displayName || '';
          const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          const user = await findOrCreateOAuthUser('microsoft', profile.id, email, displayName, avatarUrl);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('[OAuth] Microsoft strategy configured');
}

// Configure GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/github/callback`,
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const displayName = profile.displayName || profile.username || '';
          const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          const user = await findOrCreateOAuthUser('github', profile.id, email, displayName, avatarUrl);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('[OAuth] GitHub strategy configured');
}

// Configure Apple OAuth Strategy
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY_PATH) {
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/apple/callback`,
        scope: ['name', 'email']
      },
      async (accessToken, refreshToken, idToken, profile, done) => {
        try {
          const email = profile.email || null;
          const displayName = profile.name ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim() : '';
          const avatarUrl = null; // Apple doesn't provide avatar URLs

          const user = await findOrCreateOAuthUser('apple', profile.sub, email, displayName, avatarUrl);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('[OAuth] Apple strategy configured');
}

// Serialize user for session storage
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return done(new Error('User not found'), null);
    }
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

// Helper function to generate JWT token for OAuth users
export function generateOAuthToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export default passport;
