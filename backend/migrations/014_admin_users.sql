-- Migration 014: Create admin_users table for separate config app authentication
-- This table is completely independent from the main 'users' table.
-- Admin access is managed through this table with a separate JWT secret.

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    full_name VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_oauth ON admin_users(oauth_provider, oauth_id);

-- Seed default admin (Google OAuth)
INSERT INTO admin_users (email, full_name, oauth_provider)
VALUES ('alex@klamkin.com', 'Alex Klamkin', 'google')
ON CONFLICT (email) DO NOTHING;
