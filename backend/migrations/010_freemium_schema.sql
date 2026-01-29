-- Migration 010: Freemium Schema
-- Adds tier tracking, AI credits (account-level), usage tracking, and template management
-- AI credits are per ACCOUNT (not per resume), given once at signup, never reset

-- 1. Add tier tracking and AI credits to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_credits_total INTEGER DEFAULT 5,      -- Total credits allocated (lifetime)
ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0;       -- Credits consumed (lifetime)

-- 2. Monthly usage tracking (for PDF downloads, not AI credits)
CREATE TABLE IF NOT EXISTS user_monthly_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    pdf_downloads INTEGER DEFAULT 0,
    resumes_created INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, year_month)
);

-- 3. Resume creation rate limiting (for 3/24hr limit)
CREATE TABLE IF NOT EXISTS resume_creation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_resume_creation_log_user_time
ON resume_creation_log(user_id, created_at DESC);

-- 4. AI usage audit log (for debugging and analytics)
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'improve_summary', 'analyze_ats', 'invoke'
    credits_used INTEGER DEFAULT 1,
    user_tier VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user
ON ai_usage_log(user_id, created_at DESC);

-- 5. Template metadata table (for premium flag and collections)
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'foundations', 'peaks', 'canyons', 'waters', 'forests', 'coasts'
    style VARCHAR(100),
    is_premium BOOLEAN DEFAULT true,
    preview_image_url VARCHAR(500),
    description TEXT,
    best_for TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Update existing users based on subscription status
-- Subscribed users: set tier to 'paid', unlimited credits
UPDATE users SET
    user_tier = 'paid',
    ai_credits_total = 999999,
    tier_updated_at = NOW()
WHERE is_subscribed = true;

-- Non-subscribed users: set tier to 'free', 5 credits
UPDATE users SET
    user_tier = 'free',
    ai_credits_total = 5,
    ai_credits_used = 0,
    tier_updated_at = NOW()
WHERE is_subscribed = false OR is_subscribed IS NULL;

-- 7. Insert FREE templates (Foundations Collection)
INSERT INTO templates (id, name, category, is_premium, description, best_for, sort_order) VALUES
('sierra', 'Sierra', 'foundations', false, 'Clean ATS-optimized single column layout with balanced spacing', 'General purpose', 1),
('prairie', 'Prairie', 'foundations', false, 'Traditional ATS-friendly design with classic structure', 'Corporate, finance', 2),
('cascade', 'Cascade', 'foundations', false, 'Minimalist single column with generous white space', 'Tech, startups', 3),
('piedmont', 'Piedmont', 'foundations', false, 'Classic professional layout with subtle accents', 'Healthcare, education', 4),
('mesa', 'Mesa', 'foundations', false, 'Modern ATS-optimized format with clean lines', 'Entry-level', 5)
ON CONFLICT (id) DO NOTHING;

-- 8. Insert PREMIUM templates - Peaks Collection (Modern/Professional)
INSERT INTO templates (id, name, category, is_premium, description, best_for, sort_order) VALUES
('denali', 'Denali', 'peaks', true, 'Bold two-column layout with strong visual hierarchy', 'Executive, leadership', 10),
('rainier', 'Rainier', 'peaks', true, 'Tech-focused design with sidebar skills section', 'Tech, engineering', 11),
('whitney', 'Whitney', 'peaks', true, 'Sophisticated two-column with metric highlights', 'Finance, consulting', 12),
('shasta', 'Shasta', 'peaks', true, 'Creative-tech hybrid with accent color bar', 'Creative tech', 13),
('hood', 'Hood', 'peaks', true, 'Developer-friendly layout with code-style elements', 'Software, IT', 14),
('teton', 'Teton', 'peaks', true, 'Professional two-column with executive summary box', 'Business, consulting', 15),
('olympus', 'Olympus', 'peaks', true, 'Design-forward layout with portfolio section', 'Design, architecture', 16),
('maroon', 'Maroon', 'peaks', true, 'Marketing-optimized with achievement callouts', 'Marketing, sales', 17),
('lassen', 'Lassen', 'peaks', true, 'Startup-style with modern typography', 'Startups', 18),
('elbert', 'Elbert', 'peaks', true, 'Management-focused with leadership highlights', 'Management', 19)
ON CONFLICT (id) DO NOTHING;

-- 9. Insert PREMIUM templates - Canyons Collection (Bold/Creative)
INSERT INTO templates (id, name, category, is_premium, description, best_for, sort_order) VALUES
('bryce', 'Bryce', 'canyons', true, 'Bold creative layout with striking header', 'Creative, design', 20),
('zion', 'Zion', 'canyons', true, 'Artistic design with color accent blocks', 'Art, galleries', 21),
('antelope', 'Antelope', 'canyons', true, 'Visual-forward layout with portfolio grid', 'Photography, media', 22),
('arches', 'Arches', 'canyons', true, 'Dynamic layout with curved design elements', 'Advertising, PR', 23),
('badlands', 'Badlands', 'canyons', true, 'Dramatic dark-mode option with bold typography', 'Film, entertainment', 24),
('canyonlands', 'Canyonlands', 'canyons', true, 'Storytelling layout with timeline format', 'Journalism', 25),
('sedona', 'Sedona', 'canyons', true, 'Warm, approachable design with soft accents', 'Wellness, coaching', 26),
('monument', 'Monument', 'canyons', true, 'Mission-driven layout with impact metrics', 'Non-profit', 27)
ON CONFLICT (id) DO NOTHING;

-- 10. Insert PREMIUM templates - Waters Collection (Clean/Minimalist)
INSERT INTO templates (id, name, category, is_premium, description, best_for, sort_order) VALUES
('tahoe', 'Tahoe', 'waters', true, 'Crystal-clear minimalist with perfect spacing', 'Clean, modern roles', 30),
('superior', 'Superior', 'waters', true, 'Commanding presence with subtle elegance', 'Corporate leadership', 31),
('glacier', 'Glacier', 'waters', true, 'Ultra-minimalist with maximum white space', 'Ultra-minimalist', 32),
('yellowstone', 'Yellowstone', 'waters', true, 'Academic-style with publication section', 'Research, academia', 33),
('columbia', 'Columbia', 'waters', true, 'International format with language skills', 'International', 34),
('niagara', 'Niagara', 'waters', true, 'High-energy layout with bold metrics', 'Sales, energy', 35),
('hudson', 'Hudson', 'waters', true, 'Wall Street professional with financial focus', 'Finance, Wall Street', 36),
('chesapeake', 'Chesapeake', 'waters', true, 'Government-ready format with clearance section', 'Government, policy', 37)
ON CONFLICT (id) DO NOTHING;

-- 11. Insert PREMIUM templates - Forests Collection (Executive/Traditional)
INSERT INTO templates (id, name, category, is_premium, description, best_for, sort_order) VALUES
('redwood', 'Redwood', 'forests', true, 'Executive presence with board-ready format', 'C-suite, boards', 40),
('sequoia', 'Sequoia', 'forests', true, 'Legal-professional with case highlight section', 'Legal, consulting', 41),
('acadia', 'Acadia', 'forests', true, 'Academic excellence with research focus', 'Academia, research', 42),
('olympic', 'Olympic', 'forests', true, 'Healthcare professional with credentials display', 'Healthcare, pharma', 43),
('everglades', 'Everglades', 'forests', true, 'Operations-focused with process highlights', 'Operations', 44),
('shenandoah', 'Shenandoah', 'forests', true, 'Government executive with service record', 'Government', 45),
('muir', 'Muir', 'forests', true, 'Sustainability-focused with impact metrics', 'Environmental, sustainability', 46)
ON CONFLICT (id) DO NOTHING;

-- 12. Insert PREMIUM templates - Coasts Collection (Fresh/Modern)
INSERT INTO templates (id, name, category, is_premium, description, best_for, sort_order) VALUES
('pacific', 'Pacific', 'coasts', true, 'West coast tech style with modern grid', 'Tech, FAANG', 50),
('atlantic', 'Atlantic', 'coasts', true, 'East coast professional with traditional polish', 'Finance, banking', 51),
('malibu', 'Malibu', 'coasts', true, 'Entertainment industry with credits section', 'Entertainment', 52),
('cape-cod', 'Cape Cod', 'coasts', true, 'Hospitality-focused with service highlights', 'Hospitality', 53),
('big-sur', 'Big Sur', 'coasts', true, 'Creative agency style with portfolio links', 'Creative agencies', 54),
('outer-banks', 'Outer Banks', 'coasts', true, 'Retail-ready with customer focus', 'Retail, e-commerce', 55),
('sonoma', 'Sonoma', 'coasts', true, 'Luxury brand aesthetic with refined details', 'Luxury brands', 56)
ON CONFLICT (id) DO NOTHING;
