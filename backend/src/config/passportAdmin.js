import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from './database.js';
import jwt from 'jsonwebtoken';

// Helper function to find existing admin user via OAuth (does NOT create new accounts)
async function findAdminOAuthUser(provider, profileId, email) {
  try {
    // 1. Check by OAuth provider + ID
    const existingOAuth = await query(
      'SELECT * FROM admin_users WHERE oauth_provider = $1 AND oauth_id = $2 AND is_active = true',
      [provider, profileId]
    );

    if (existingOAuth.rows.length > 0) {
      await query(
        'UPDATE admin_users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
        [existingOAuth.rows[0].id]
      );
      return existingOAuth.rows[0];
    }

    // 2. Check by email (for admins seeded without oauth_id)
    if (email) {
      const existingEmail = await query(
        'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        const admin = existingEmail.rows[0];
        // Link OAuth to existing admin account
        await query(
          'UPDATE admin_users SET oauth_provider = $1, oauth_id = $2, last_login = NOW(), updated_at = NOW() WHERE id = $3',
          [provider, profileId, admin.id]
        );
        return { ...admin, oauth_provider: provider, oauth_id: profileId };
      }
    }

    // 3. Not found - admin must be pre-created. Do NOT auto-create.
    return null;
  } catch (error) {
    console.error('[Admin OAuth] Error in findAdminOAuthUser:', error);
    throw error;
  }
}

// Configure Google OAuth Strategy for Admin (named 'google-admin')
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    'google-admin',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/admin/auth/google/callback`,
        scope: ['profile', 'email'],
        prompt: 'select_account'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const admin = await findAdminOAuthUser('google', profile.id, email);

          if (!admin) {
            console.log(`[Admin OAuth] Rejected login: ${email} is not an admin`);
            return done(null, false, { message: 'Not authorized as admin' });
          }

          // Update avatar if available
          const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          if (avatarUrl) {
            await query('UPDATE admin_users SET avatar_url = $1 WHERE id = $2', [avatarUrl, admin.id]);
          }

          const displayName = profile.displayName || '';
          if (displayName && !admin.full_name) {
            await query('UPDATE admin_users SET full_name = $1 WHERE id = $2', [displayName, admin.id]);
          }

          console.log(`[Admin OAuth] Authenticated admin: ${email}`);
          return done(null, admin);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('[Admin OAuth] Google admin strategy configured');
}

// Generate admin JWT token
export function generateAdminToken(adminUser) {
  return jwt.sign(
    { adminId: adminUser.id, email: adminUser.email, isAdmin: true },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '4h' }
  );
}

export default passport;
