# Freemium Model Implementation Plan

## Executive Summary

Transform Resumakr from a paywall-first model to a freemium model that allows free users limited access while driving conversions to paid tiers.

---

## Feature Tier Breakdown

### FREE TIER (No Credit Card Required)

| Feature | Limit |
|---------|-------|
| Resume creation/editing | Unlimited |
| Basic templates | 5 templates |
| **AI credits (TOTAL per account)** | **5 credits lifetime** |
| PDF download | 1/month (watermarked) |
| TXT download | Unlimited |
| ATS analysis | Score only (no details) |
| Work experience entries | Unlimited |
| Education entries | Unlimited |
| Skills | Unlimited |
| Cover letters | Disabled |
| Version history | Disabled |
| Resume parsing (AI extract) | Disabled |
| Rate limit | Max 3 resumes created per 24 hours |

**Important:** Free users get 5 AI credits TOTAL when they create their account. These do NOT reset monthly. Once exhausted, they must upgrade to continue using AI features. This creates strong conversion pressure.

### PAID TIERS (Current pricing: $0.99/day, $6.49/week, $28.99/month)

| Feature | Paid |
|---------|------|
| Premium templates | 40+ |
| AI assistance | Unlimited |
| PDF download | Unlimited, no watermark |
| ATS analysis | Full detailed insights |
| Cover letters | Short & long |
| Version history | Enabled |
| Resume parsing | Full AI extraction |
| LinkedIn optimization | Enabled |

---

## Template Strategy

### Naming Convention: American Geography
Using **American landmarks, mountains, canyons, and natural features** for a unique, memorable naming scheme that evokes achievement and natural grandeur.

### Template Categories & Collections

| Collection | Vibe | Count |
|------------|------|-------|
| **Foundations** (Free) | Solid, approachable | 5 |
| **Peaks** | Ambitious, professional | 10 |
| **Canyons** | Bold, creative | 8 |
| **Waters** | Clean, minimalist | 8 |
| **Forests** | Executive, timeless | 7 |
| **Coasts** | Fresh, modern | 7 |
| **Total** | | **45** |

---

### FREE TEMPLATES (5) - Foundations Collection

| Template | Inspiration | Style | Best For |
|----------|-------------|-------|----------|
| **Sierra** | Sierra Nevada range | ATS-Optimized, Clean | General purpose |
| **Prairie** | Great Plains | ATS-Optimized, Traditional | Corporate, finance |
| **Cascade** | Cascade Range | Minimalist, Single Column | Tech, startups |
| **Piedmont** | East coast foothills | ATS-Optimized, Classic | Healthcare, education |
| **Mesa** | Southwest plateaus | ATS-Optimized, Modern | Entry-level |

*Rationale: Foundational, approachable names. ATS-friendly single-column designs that work well but lack visual distinction, encouraging upgrades.*

---

### PREMIUM TEMPLATES (40)

#### Peaks Collection (10) - Modern/Professional
| Template | Inspiration | Best For |
|----------|-------------|----------|
| Denali | Alaska's highest peak | Executive, leadership |
| Rainier | Pacific Northwest icon | Tech, engineering |
| Whitney | Highest in lower 48 | Finance, consulting |
| Shasta | Northern California | Creative tech |
| Hood | Oregon landmark | Software, IT |
| Teton | Wyoming grandeur | Business, consulting |
| Olympus | Washington state | Design, architecture |
| Maroon | Colorado's iconic bells | Marketing, sales |
| Lassen | Volcanic California | Startups |
| Elbert | Colorado's highest | Management |

#### Canyons Collection (8) - Bold/Creative
| Template | Inspiration | Best For |
|----------|-------------|----------|
| Bryce | Utah hoodoos | Creative, design |
| Zion | Utah's majesty | Art, galleries |
| Antelope | Slot canyon beauty | Photography, media |
| Arches | Natural bridges | Advertising, PR |
| Badlands | Raw, striking | Film, entertainment |
| Canyonlands | Vast landscape | Journalism |
| Sedona | Red rock country | Wellness, coaching |
| Monument | Iconic buttes | Non-profit |

#### Waters Collection (8) - Clean/Minimalist
| Template | Inspiration | Best For |
|----------|-------------|----------|
| Tahoe | Crystal clarity | Clean, modern roles |
| Superior | Great Lakes | Corporate leadership |
| Glacier | Montana pristine | Ultra-minimalist |
| Yellowstone | Iconic geyser | Research, academia |
| Columbia | Pacific Northwest | International |
| Niagara | Powerful falls | Sales, energy |
| Hudson | New York river | Finance, Wall Street |
| Chesapeake | Eastern seaboard | Government, policy |

#### Forests Collection (7) - Executive/Traditional
| Template | Inspiration | Best For |
|----------|-------------|----------|
| Redwood | Ancient giants | C-suite, boards |
| Sequoia | Majestic groves | Legal, consulting |
| Acadia | New England | Academia, research |
| Olympic | Rainforest | Healthcare, pharma |
| Everglades | Florida wilderness | Operations |
| Shenandoah | Blue Ridge | Government |
| Muir | John Muir Woods | Environmental, sustainability |

#### Coasts Collection (7) - Fresh/Modern
| Template | Inspiration | Best For |
|----------|-------------|----------|
| Pacific | West coast | Tech, FAANG |
| Atlantic | East coast | Finance, banking |
| Malibu | California cool | Entertainment |
| Cape Cod | New England charm | Hospitality |
| Big Sur | Dramatic coastline | Creative agencies |
| Outer Banks | Carolina shores | Retail, e-commerce |
| Sonoma | Wine country | Luxury brands |

---

### Template Feature Comparison

| Feature | Free Templates | Premium Templates |
|---------|----------------|-------------------|
| Color customization | Limited (3 colors) | Full palette |
| Font options | 2 fonts | 15+ fonts |
| Section reordering | No | Yes |
| Custom sections | No | Yes |
| Photo placement | Fixed | Flexible |
| Icon library | Basic | Extended (500+) |
| Multiple layouts | No | Yes |

### Implementation Notes

1. **Template Storage**: Templates defined in `frontend/src/templates/` with metadata in database
2. **Premium Check**: On template selection, verify `template.isPremium` against user tier
3. **Preview**: Allow free users to PREVIEW premium templates (watermarked) to drive conversions
4. **Upgrade Prompt**: "This template is premium. Upgrade to unlock 40+ professional designs."

---

## Implementation Phases

### Phase 1: Database Schema Changes

**Migration file: `backend/migrations/010_freemium_schema.sql`**

```sql
-- 1. Add tier tracking and AI credits to users table
-- AI credits are per ACCOUNT (not per resume), given once at signup
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_credits_total INTEGER DEFAULT 5,      -- Total credits allocated
ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0;       -- Credits consumed

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

-- 5. Template metadata table (for premium flag)
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'ats', 'modern', 'creative', 'executive', 'minimalist', 'industry'
    style VARCHAR(100),
    is_premium BOOLEAN DEFAULT true,
    preview_image_url VARCHAR(500),
    description TEXT,
    best_for TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Update existing users
-- Subscribed users: set tier to 'paid', unlimited credits
UPDATE users SET user_tier = 'paid', ai_credits_total = 999999 WHERE is_subscribed = true;
-- Non-subscribed users: set tier to 'free', 5 credits
UPDATE users SET user_tier = 'free', ai_credits_total = 5, ai_credits_used = 0 WHERE is_subscribed = false OR is_subscribed IS NULL;

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
```

**Data migration for existing users:**
- All `is_subscribed = true` users → `user_tier = 'paid'`, unlimited AI credits
- All other users → `user_tier = 'free'`, 5 AI credits total

---

### Phase 2: Backend Utility Functions

**New file: `backend/src/utils/tierLimits.js`**

```javascript
// Tier configuration (can later be moved to database)
export const TIER_LIMITS = {
  free: {
    aiCreditsTotal: 5,           // 5 credits TOTAL per account (not per resume, not monthly)
    pdfDownloadsPerMonth: 1,
    maxResumesPerDay: 3,
    premiumTemplates: false,
    coverLetters: false,
    versionHistory: false,
    resumeParsing: false,
    atsDetailedInsights: false,
    watermarkPdf: true,
    freeTemplateIds: ['sierra', 'prairie', 'cascade', 'piedmont', 'mesa']
  },
  paid: {
    aiCreditsTotal: Infinity,    // Unlimited for paid users
    pdfDownloadsPerMonth: Infinity,
    maxResumesPerDay: Infinity,
    premiumTemplates: true,
    coverLetters: true,
    versionHistory: true,
    resumeParsing: true,
    atsDetailedInsights: true,
    watermarkPdf: false,
    freeTemplateIds: null // all templates
  }
};

export function getUserTier(user) {
  // Paid user = active subscription
  if (user.is_subscribed && user.subscription_end_date > new Date()) {
    return 'paid';
  }
  return 'free';
}

export function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

// Check if user has AI credits remaining
export function hasAiCreditsRemaining(user) {
  if (getUserTier(user) === 'paid') return true;
  return (user.ai_credits_used || 0) < (user.ai_credits_total || 5);
}

// Get remaining AI credits
export function getRemainingAiCredits(user) {
  if (getUserTier(user) === 'paid') return Infinity;
  return Math.max(0, (user.ai_credits_total || 5) - (user.ai_credits_used || 0));
}
```

**New file: `backend/src/utils/usageTracking.js`**

```javascript
import { query } from '../config/database.js';

// Get current month string (YYYY-MM)
export function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get or create monthly usage record (for PDF downloads)
export async function getMonthlyUsage(userId) {
  const yearMonth = getCurrentYearMonth();

  // Upsert pattern
  const result = await query(`
    INSERT INTO user_monthly_usage (user_id, year_month)
    VALUES ($1, $2)
    ON CONFLICT (user_id, year_month) DO UPDATE SET updated_at = NOW()
    RETURNING *
  `, [userId, yearMonth]);

  return result.rows[0];
}

// Increment PDF download count
export async function incrementPdfDownload(userId) {
  const yearMonth = getCurrentYearMonth();
  await query(`
    INSERT INTO user_monthly_usage (user_id, year_month, pdf_downloads)
    VALUES ($1, $2, 1)
    ON CONFLICT (user_id, year_month)
    DO UPDATE SET pdf_downloads = user_monthly_usage.pdf_downloads + 1, updated_at = NOW()
  `, [userId, yearMonth]);
}

// Check resume creation rate limit (3 per 24 hours for free users)
export async function checkResumeCreationLimit(userId) {
  const result = await query(`
    SELECT COUNT(*) as count
    FROM resume_creation_log
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
  `, [userId]);

  return parseInt(result.rows[0].count);
}

// Log resume creation
export async function logResumeCreation(userId, resumeId) {
  await query(`
    INSERT INTO resume_creation_log (user_id, resume_id)
    VALUES ($1, $2)
  `, [userId, resumeId]);
}

// ============================================
// AI CREDITS - ACCOUNT LEVEL (NOT PER RESUME)
// ============================================

// Get user's AI credit balance
export async function getUserAiCredits(userId) {
  const result = await query(`
    SELECT ai_credits_total, ai_credits_used
    FROM users
    WHERE id = $1
  `, [userId]);

  if (!result.rows[0]) {
    return { total: 5, used: 0, remaining: 5 };
  }

  const { ai_credits_total, ai_credits_used } = result.rows[0];
  return {
    total: ai_credits_total || 5,
    used: ai_credits_used || 0,
    remaining: Math.max(0, (ai_credits_total || 5) - (ai_credits_used || 0))
  };
}

// Check if user has AI credits remaining
export async function hasAiCreditsRemaining(userId) {
  const credits = await getUserAiCredits(userId);
  return credits.remaining > 0;
}

// Deduct AI credit from user's account
export async function deductAiCredit(userId, resumeId, action, credits = 1) {
  // Update user's credit balance
  await query(`
    UPDATE users
    SET ai_credits_used = COALESCE(ai_credits_used, 0) + $2
    WHERE id = $1
  `, [userId, credits]);

  // Log the usage for analytics
  await query(`
    INSERT INTO ai_usage_log (user_id, resume_id, action, credits_used, user_tier)
    SELECT $1, $2, $3, $4, user_tier FROM users WHERE id = $1
  `, [userId, resumeId, action, credits]);

  // Return updated balance
  return getUserAiCredits(userId);
}

// Grant AI credits to user (for upgrades, promos, etc.)
export async function grantAiCredits(userId, credits) {
  await query(`
    UPDATE users
    SET ai_credits_total = COALESCE(ai_credits_total, 5) + $2
    WHERE id = $1
  `, [userId, credits]);

  return getUserAiCredits(userId);
}

// Reset AI credits for paid user (set to unlimited)
export async function setUnlimitedAiCredits(userId) {
  await query(`
    UPDATE users
    SET ai_credits_total = 999999, ai_credits_used = 0, user_tier = 'paid'
    WHERE id = $1
  `, [userId]);
}
```

---

### Phase 3: Middleware Updates

**Update: `backend/src/middleware/auth.js`**

```javascript
import { query } from '../config/database.js';
import { getUserTier, getTierLimits } from '../utils/tierLimits.js';

// Existing authenticate middleware - ADD tier info
export async function authenticate(req, res, next) {
  // ... existing JWT validation code ...

  const result = await query(
    `SELECT id, email, full_name, role, is_subscribed, subscription_plan,
            subscription_end_date, user_tier
     FROM users WHERE id = $1`,
    [decoded.userId]
  );

  const user = result.rows[0];

  // Calculate effective tier
  user.effectiveTier = getUserTier(user);
  user.tierLimits = getTierLimits(user.effectiveTier);

  req.user = user;
  next();
}

// NEW: Middleware that allows free users but enforces limits
export function requireFeature(featureName) {
  return (req, res, next) => {
    const limits = req.user.tierLimits;

    if (!limits[featureName]) {
      return res.status(403).json({
        error: 'Premium feature required',
        feature: featureName,
        message: getUpgradeMessage(featureName),
        upgradeUrl: '/pricing'
      });
    }

    next();
  };
}

function getUpgradeMessage(feature) {
  const messages = {
    coverLetters: 'Cover letters are a premium feature. Upgrade to create professional cover letters.',
    versionHistory: 'Version history is a premium feature. Upgrade to track changes to your resume.',
    resumeParsing: 'AI resume parsing is a premium feature. Upgrade to automatically extract data from uploaded resumes.',
    atsDetailedInsights: 'Detailed ATS insights are a premium feature. Upgrade to see exactly what to improve.',
    premiumTemplates: 'This template is premium. Upgrade to access all 40+ professional templates.'
  };
  return messages[feature] || 'This is a premium feature. Upgrade to access it.';
}

// KEEP existing requireSubscription for truly paid-only features
// But most routes will now use authenticate alone or with requireFeature
```

---

### Phase 4: Route Changes

#### 4.1 Resume Routes (`backend/src/routes/resumes.js`)

**Changes:**
- Remove `requireSubscription` from all routes
- Add rate limiting for free tier resume creation
- Keep `authenticate` requirement

```javascript
import { authenticate } from '../middleware/auth.js';
import { checkResumeCreationLimit, logResumeCreation } from '../utils/usageTracking.js';

// REMOVE: router.use(requireSubscription);

// GET /api/resumes - Allow all authenticated users
router.get('/', authenticate, async (req, res) => {
  // ... existing code, no changes needed ...
});

// POST /api/resumes - Add rate limiting for free users
router.post('/', authenticate, async (req, res) => {
  try {
    // Rate limit check for free users
    if (req.user.effectiveTier === 'free') {
      const resumesCreatedToday = await checkResumeCreationLimit(req.user.id);
      if (resumesCreatedToday >= req.user.tierLimits.maxResumesPerDay) {
        return res.status(429).json({
          error: 'Daily resume limit reached',
          message: `Free users can create up to ${req.user.tierLimits.maxResumesPerDay} resumes per day. Upgrade for unlimited resumes.`,
          upgradeUrl: '/pricing',
          resetIn: '24 hours'
        });
      }
    }

    // ... existing resume creation code ...

    // Log creation for rate limiting
    await logResumeCreation(req.user.id, resume.id);

    res.status(201).json(resume);
  } catch (error) {
    // ... error handling ...
  }
});

// PUT, DELETE - No changes needed, allow all authenticated users
```

#### 4.2 Resume Data Routes (`backend/src/routes/resumeData.js`)

**Changes:**
- Remove `requireSubscription`
- Block cover letter fields for free users
- Allow all other fields

```javascript
// REMOVE: router.use(requireSubscription);

// PUT /api/resume-data/:id - Add field restrictions
router.put('/:id', authenticate, async (req, res) => {
  try {
    const updates = req.body;

    // Block cover letter updates for free users
    if (req.user.effectiveTier === 'free') {
      if (updates.cover_letter_short || updates.cover_letter_long) {
        return res.status(403).json({
          error: 'Premium feature required',
          feature: 'coverLetters',
          message: 'Cover letters are a premium feature. Upgrade to create professional cover letters.',
          upgradeUrl: '/pricing'
        });
      }
    }

    // ... existing update code ...
  } catch (error) {
    // ... error handling ...
  }
});
```

#### 4.3 AI Routes (`backend/src/routes/ai.js`)

**Changes:**
- Remove `requireSubscription`
- Add ACCOUNT-LEVEL credit tracking for free users (5 credits total, not per resume)
- Return different detail levels for ATS based on tier

```javascript
import { getUserAiCredits, deductAiCredit } from '../utils/usageTracking.js';

// REMOVE: router.use(requireSubscription);

// Middleware to check AI credits for free users (ACCOUNT LEVEL)
async function checkAiCredits(req, res, next) {
  if (req.user.effectiveTier === 'paid') {
    return next(); // Unlimited for paid users
  }

  // Check account-level credits (not per-resume)
  const credits = await getUserAiCredits(req.user.id);

  if (credits.remaining <= 0) {
    return res.status(403).json({
      error: 'AI credits exhausted',
      message: `You've used all ${credits.total} AI credits on your free account. Upgrade for unlimited AI assistance.`,
      creditsUsed: credits.used,
      creditsTotal: credits.total,
      creditsRemaining: 0,
      upgradeUrl: '/pricing'
    });
  }

  req.aiCredits = credits;
  next();
}

// POST /api/ai/improve-summary
router.post('/improve-summary', authenticate, checkAiCredits, async (req, res) => {
  try {
    // ... existing AI call code ...

    // Deduct credit from user's ACCOUNT (not resume)
    let updatedCredits = null;
    if (req.user.effectiveTier === 'free') {
      updatedCredits = await deductAiCredit(
        req.user.id,
        req.body.resumeId,
        'improve_summary',
        1
      );
    }

    res.json({
      ...result,
      credits: updatedCredits ? {
        used: updatedCredits.used,
        total: updatedCredits.total,
        remaining: updatedCredits.remaining
      } : null // null for paid users (unlimited)
    });
  } catch (error) {
    // ... error handling ...
  }
});

// POST /api/ai/analyze-ats - Different response for free vs paid
router.post('/analyze-ats', authenticate, checkAiCredits, async (req, res) => {
  try {
    // ... existing ATS analysis code ...

    // Deduct credit from user's ACCOUNT
    let updatedCredits = null;
    if (req.user.effectiveTier === 'free') {
      updatedCredits = await deductAiCredit(
        req.user.id,
        req.body.resumeId,
        'analyze_ats',
        1
      );
    }

    // Filter response for free users - show score only, hide details
    let response = atsResult;
    if (req.user.effectiveTier === 'free') {
      response = {
        score: atsResult.score,
        message: 'Upgrade to see detailed insights on how to improve your resume.',
        // Hide detailed insights for free users
        detailedInsights: null,
        suggestions: null,
        keywordAnalysis: null,
        upgradeUrl: '/pricing'
      };
    }

    res.json({
      ...response,
      credits: updatedCredits ? {
        used: updatedCredits.used,
        total: updatedCredits.total,
        remaining: updatedCredits.remaining
      } : null // null for paid users (unlimited)
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

#### 4.4 Version Routes (`backend/src/routes/versions.js`)

**Changes:**
- Add feature check - premium only

```javascript
import { authenticate, requireFeature } from '../middleware/auth.js';

// All version routes require premium
router.use(authenticate);
router.use(requireFeature('versionHistory'));

// ... existing routes unchanged ...
```

#### 4.5 Upload Routes (`backend/src/routes/upload.js`)

**Changes:**
- Allow file upload for all users
- Block AI extraction for free users

```javascript
// POST /api/upload - Allow all authenticated users
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  // ... existing upload code, no changes ...
});

// POST /api/upload/extract - Premium only
router.post('/extract', authenticate, requireFeature('resumeParsing'), async (req, res) => {
  // ... existing extraction code ...
});
```

#### 4.6 New Export Route (`backend/src/routes/export.js`)

**New file for PDF/TXT downloads with watermarking:**

```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMonthlyUsage, incrementPdfDownload } from '../utils/usageTracking.js';

const router = express.Router();

// POST /api/export/pdf
router.post('/pdf', authenticate, async (req, res) => {
  try {
    const { resumeId, html } = req.body;
    const tier = req.user.effectiveTier;
    const limits = req.user.tierLimits;

    // Check monthly download limit for free users
    if (tier === 'free') {
      const usage = await getMonthlyUsage(req.user.id);
      if (usage.pdf_downloads >= limits.pdfDownloadsPerMonth) {
        return res.status(403).json({
          error: 'Monthly PDF download limit reached',
          message: `Free users can download ${limits.pdfDownloadsPerMonth} PDF per month. Upgrade for unlimited downloads.`,
          downloadsUsed: usage.pdf_downloads,
          downloadsLimit: limits.pdfDownloadsPerMonth,
          upgradeUrl: '/pricing',
          resetDate: getNextMonthStart()
        });
      }
    }

    // Generate PDF (implementation depends on your PDF library)
    let pdfBuffer = await generatePdf(html);

    // Add watermark for free users
    if (limits.watermarkPdf) {
      pdfBuffer = await addWatermark(pdfBuffer, 'Created with Resumakr.us - Upgrade to remove watermark');
    }

    // Track download for free users
    if (tier === 'free') {
      await incrementPdfDownload(req.user.id);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// POST /api/export/txt - Unlimited for all users
router.post('/txt', authenticate, async (req, res) => {
  try {
    const { resumeId } = req.body;

    // Get resume data and convert to plain text
    const resumeData = await getResumeData(resumeId);
    const textContent = convertToPlainText(resumeData);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="resume.txt"`);
    res.send(textContent);
  } catch (error) {
    console.error('TXT export error:', error);
    res.status(500).json({ error: 'Failed to generate TXT' });
  }
});

function getNextMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export default router;
```

#### 4.7 New User Tier Endpoint (`backend/src/routes/subscriptions.js`)

**Add endpoint to get current tier and usage:**

```javascript
// GET /api/subscriptions/my-tier
router.get('/my-tier', authenticate, async (req, res) => {
  try {
    const usage = await getMonthlyUsage(req.user.id);
    const tier = req.user.effectiveTier;
    const limits = req.user.tierLimits;

    res.json({
      tier,
      limits,
      usage: {
        pdfDownloads: {
          used: usage.pdf_downloads,
          limit: limits.pdfDownloadsPerMonth,
          remaining: Math.max(0, limits.pdfDownloadsPerMonth - usage.pdf_downloads)
        },
        resumesCreatedToday: await checkResumeCreationLimit(req.user.id),
        maxResumesPerDay: limits.maxResumesPerDay
      },
      features: {
        coverLetters: limits.coverLetters,
        versionHistory: limits.versionHistory,
        resumeParsing: limits.resumeParsing,
        atsDetailedInsights: limits.atsDetailedInsights,
        premiumTemplates: limits.premiumTemplates,
        watermarkPdf: limits.watermarkPdf
      },
      upgradeUrl: tier === 'free' ? '/pricing' : null
    });
  } catch (error) {
    console.error('Get tier error:', error);
    res.status(500).json({ error: 'Failed to get tier information' });
  }
});
```

---

### Phase 5: Template System Updates

**Update template handling to distinguish free vs premium:**

```javascript
// In resume data routes or a new templates route

// GET /api/templates
router.get('/templates', authenticate, async (req, res) => {
  const allTemplates = getAvailableTemplates(); // Your template list
  const tier = req.user.effectiveTier;
  const freeTemplateIds = req.user.tierLimits.freeTemplateIds;

  const templates = allTemplates.map(template => ({
    ...template,
    isPremium: freeTemplateIds && !freeTemplateIds.includes(template.id),
    isLocked: tier === 'free' && freeTemplateIds && !freeTemplateIds.includes(template.id)
  }));

  res.json(templates);
});

// When saving template selection, validate free users can't use premium templates
router.put('/resume-data/:id', authenticate, async (req, res) => {
  // ... existing code ...

  if (req.user.effectiveTier === 'free' && updates.template_id) {
    const freeTemplateIds = req.user.tierLimits.freeTemplateIds;
    if (freeTemplateIds && !freeTemplateIds.includes(updates.template_id)) {
      return res.status(403).json({
        error: 'Premium template',
        message: 'This template is premium. Upgrade to access all 40+ professional templates.',
        upgradeUrl: '/pricing'
      });
    }
  }

  // ... continue with update ...
});
```

---

### Phase 6: Frontend Changes

#### 6.1 API Client Updates (`frontend/src/api/apiClient.js`)

```javascript
// Add new tier-related methods
api.subscription = {
  ...api.subscription,

  getMyTier: () => client.get('/subscriptions/my-tier'),

  // Helper to check if feature is available
  canUseFeature: async (featureName) => {
    const { data } = await api.subscription.getMyTier();
    return data.features[featureName] === true;
  }
};

api.export = {
  downloadPdf: (resumeId, html) => client.post('/export/pdf', { resumeId, html }, { responseType: 'blob' }),
  downloadTxt: (resumeId) => client.post('/export/txt', { resumeId }, { responseType: 'blob' })
};
```

#### 6.2 New Context/Hook for Tier Management

**New file: `frontend/src/contexts/TierContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/apiClient';

const TierContext = createContext();

export function TierProvider({ children }) {
  const [tierData, setTierData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshTier = async () => {
    try {
      const { data } = await api.subscription.getMyTier();
      setTierData(data);
    } catch (error) {
      console.error('Failed to fetch tier:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTier();
  }, []);

  const canUseFeature = (featureName) => {
    return tierData?.features?.[featureName] === true;
  };

  const isPremium = tierData?.tier === 'paid';

  return (
    <TierContext.Provider value={{
      tierData,
      loading,
      refreshTier,
      canUseFeature,
      isPremium
    }}>
      {children}
    </TierContext.Provider>
  );
}

export const useTier = () => useContext(TierContext);
```

#### 6.3 Upgrade Prompt Component

**New file: `frontend/src/components/UpgradePrompt.jsx`**

```jsx
import { Link } from 'react-router-dom';

export function UpgradePrompt({ feature, message, onClose }) {
  const defaultMessages = {
    coverLetters: 'Create professional cover letters that complement your resume.',
    versionHistory: 'Track changes and restore previous versions of your resume.',
    resumeParsing: 'Automatically extract data from uploaded resumes with AI.',
    atsDetailedInsights: 'See exactly what to fix to improve your ATS score.',
    premiumTemplates: 'Access 40+ professional templates designed by experts.',
    aiCredits: 'Get unlimited AI assistance to perfect your resume.',
    pdfDownloads: 'Download unlimited watermark-free PDFs.'
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
      <h3 className="text-lg font-semibold mb-2">Upgrade to Premium</h3>
      <p className="mb-4">{message || defaultMessages[feature]}</p>
      <div className="flex gap-3">
        <Link
          to="/pricing"
          className="bg-white text-purple-600 px-4 py-2 rounded font-medium hover:bg-gray-100"
        >
          View Plans
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            Maybe Later
          </button>
        )}
      </div>
    </div>
  );
}
```

#### 6.4 AI Credits Display Component

**New file: `frontend/src/components/AiCreditsDisplay.jsx`**

```jsx
import { useTier } from '../contexts/TierContext';

export function AiCreditsDisplay({ resumeId, creditsUsed, creditsLimit }) {
  const { isPremium } = useTier();

  if (isPremium) {
    return (
      <span className="text-sm text-green-600">
        Unlimited AI
      </span>
    );
  }

  const remaining = creditsLimit - creditsUsed;
  const percentage = (creditsUsed / creditsLimit) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${percentage >= 80 ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm ${remaining <= 1 ? 'text-red-600' : 'text-gray-600'}`}>
        {remaining} AI credits left
      </span>
    </div>
  );
}
```

---

### Phase 7: Server Entry Point Updates

**Update: `backend/src/server.js`**

```javascript
// Add new route imports
import exportRoutes from './routes/export.js';

// Add routes (after existing routes)
app.use('/api/export', exportRoutes);
```

---

### Phase 8: PDF Watermarking Implementation

**Options for PDF watermarking:**

1. **Server-side with pdf-lib** (Recommended):
```javascript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function addWatermark(pdfBuffer, watermarkText) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: 50,
      y: 30,
      size: 10,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.5
    });
  }

  return await pdfDoc.save();
}
```

2. **Client-side before download** - Add watermark to HTML before PDF generation

---

## Migration Checklist

### Database
- [ ] Create migration `010_freemium_schema.sql`
- [ ] Run migration on development
- [ ] Verify existing users migrated correctly
- [ ] Test on staging
- [ ] Run migration on production

### Backend
- [ ] Create `utils/tierLimits.js`
- [ ] Create `utils/usageTracking.js`
- [ ] Update `middleware/auth.js` with tier info
- [ ] Update `routes/resumes.js` - remove requireSubscription, add rate limiting
- [ ] Update `routes/resumeData.js` - add cover letter blocking
- [ ] Update `routes/ai.js` - add credit system
- [ ] Update `routes/versions.js` - add feature check
- [ ] Update `routes/upload.js` - block extraction for free
- [ ] Create `routes/export.js` - new PDF/TXT export with watermark
- [ ] Update `routes/subscriptions.js` - add my-tier endpoint
- [ ] Update `server.js` - register new routes
- [ ] Install `pdf-lib` for watermarking

### Frontend
- [ ] Update `apiClient.js` with new endpoints
- [ ] Create `TierContext.jsx`
- [ ] Create `UpgradePrompt.jsx` component
- [ ] Create `AiCreditsDisplay.jsx` component
- [ ] Update resume editor to show AI credits
- [ ] Update ATS analysis to show limited results for free
- [ ] Update template selector to show locked templates
- [ ] Update cover letter UI to show upgrade prompt
- [ ] Update version history UI to show upgrade prompt
- [ ] Update download buttons with limit info
- [ ] Add tier badge to user profile/header

### Testing
- [ ] Test free user signup flow
- [ ] Test resume creation rate limiting
- [ ] Test AI credit deduction and limit
- [ ] Test PDF download limit and watermark
- [ ] Test TXT download (unlimited)
- [ ] Test ATS score-only response
- [ ] Test cover letter blocking
- [ ] Test version history blocking
- [ ] Test resume parsing blocking
- [ ] Test template locking
- [ ] Test upgrade flow from free to paid
- [ ] Test existing paid users unaffected

---

## Risk Mitigation

### Potential Issues & Solutions

1. **Existing free users suddenly get limits**
   - Solution: Grandfather existing users or give them a grace period
   - Add `freemium_migration_date` to track when limits apply

2. **Rate limiting too aggressive**
   - Solution: Start generous (5/day instead of 3), adjust based on data
   - Add admin config to adjust limits without code changes

3. **AI credits confusing users**
   - Solution: Clear UI showing credits remaining
   - Email notification when credits run low

4. **PDF watermark too intrusive**
   - Solution: Subtle footer watermark, not diagonal across page
   - Include benefit message: "Remove watermark - upgrade at resumakr.us"

5. **Breaking existing API contracts**
   - Solution: Version API if needed
   - Add `X-Tier-Limit` headers to responses
   - Return consistent error format for limit violations

---

## Rollback Plan

If issues arise:

1. **Quick rollback**: Re-add `requireSubscription` to routes
2. **Database**: `user_tier` column remains but unused
3. **Frontend**: Hide tier UI with feature flag
4. **Monitoring**: Track conversion rates, if drops significantly, rollback

---

## Success Metrics

Track after launch:
- Free user signups per day
- Free → Paid conversion rate (target: 3-5%)
- Average time to conversion
- Feature that triggers most upgrades
- Churn rate comparison
- Revenue per user (RPU)
- Cost per free user

---

## Implementation Order (Recommended)

1. **Week 1**: Database migration + Backend utilities
2. **Week 2**: Route changes (resumes, resume-data, AI)
3. **Week 3**: Export routes + watermarking + remaining routes
4. **Week 4**: Frontend tier context + upgrade prompts
5. **Week 5**: Testing + bug fixes
6. **Week 6**: Staging deployment + QA
7. **Week 7**: Production deployment + monitoring
