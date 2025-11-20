CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_plan VARCHAR(50),
    subscription_end_date TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('manual', 'uploaded')),
    file_url TEXT,
    last_edited_step VARCHAR(50),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE UNIQUE,
    job_description TEXT,
    template_id VARCHAR(50),
    template_name VARCHAR(100),
    template_custom_colors JSONB DEFAULT '{}'::jsonb,
    template_custom_fonts JSONB DEFAULT '{}'::jsonb,
    cover_letter_short TEXT,
    cover_letter_long TEXT,
    personal_info JSONB DEFAULT '{}'::jsonb,
    professional_summary TEXT,
    work_experience JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    ai_metadata JSONB DEFAULT '{}'::jsonb,
    version_history JSONB DEFAULT '{}'::jsonb,
    ats_analysis_results JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(255),
    notes TEXT,
    data_snapshot JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(resume_id, version_number)
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    period VARCHAR(50) NOT NULL,
    duration INTEGER NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('openai', 'anthropic', 'grok', 'custom')),
    api_key TEXT NOT NULL,
    custom_prompt TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    applicable_plans JSONB DEFAULT '[]'::jsonb,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS help_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intro_text TEXT,
    recipient_emails JSONB DEFAULT '[]'::jsonb,
    sender_name VARCHAR(100),
    contact_form_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO help_config (intro_text, sender_name, contact_form_enabled)
VALUES ('Welcome to Resumakr Help Center.', 'Resumakr Support', TRUE) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resume_data_updated_at BEFORE UPDATE ON resume_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_resumes_created_by ON resumes(created_by);
CREATE INDEX idx_resume_data_resume_id ON resume_data(resume_id);
CREATE INDEX idx_versions_resume_id ON resume_versions(resume_id);
