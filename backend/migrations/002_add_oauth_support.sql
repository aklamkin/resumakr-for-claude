-- Add OAuth support to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ALTER COLUMN password DROP NOT NULL;

-- Add unique constraint for OAuth provider + ID combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth
  ON users(oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL;

-- Add comment to explain the schema
COMMENT ON COLUMN users.oauth_provider IS 'OAuth provider name: google, microsoft, github, or apple';
COMMENT ON COLUMN users.oauth_id IS 'Unique user ID from OAuth provider';
COMMENT ON COLUMN users.avatar_url IS 'Profile picture URL from OAuth provider';
COMMENT ON COLUMN users.password IS 'Password hash - nullable for OAuth-only users';
