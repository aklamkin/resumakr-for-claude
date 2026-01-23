# Resumakr Growth Implementation Plan

## Goal: $10K+ MRR Through Product-Led Growth

Based on competitive analysis and proven strategies from Rezi ($226K MRR), StandOut CV (£40K MRR), and Teal (4M+ users), this plan transforms Resumakr from a hard-paywall product to a freemium growth engine.

---

## Executive Summary

### The Problem
- **Hard paywall blocks all organic growth** - users can't experience value before paying
- **No viral coefficient** - users can't share or refer without both parties paying
- **Missing SEO opportunity** - no public landing page, no content strategy
- **Limited pricing options** - no annual or lifetime plans

### The Solution
1. **Implement freemium model** - let users build resumes for free, paywall at export
2. **Add strategic pricing tiers** - annual ($99/yr) and lifetime ($149) plans
3. **Create public landing page** - SEO-optimized homepage for organic discovery
4. **Build conversion triggers** - in-app prompts that drive upgrades

### Expected Outcomes (12 months)
- **Conservative:** $3-5K MRR, 10,000 free users, 150-250 paid users
- **Optimistic:** $8-12K MRR, 25,000 free users, 400-600 paid users

---

## Phase 1: Free Tier Implementation (Week 1)

### 1.1 Database Changes

**Add to users table:**
```sql
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
-- Values: 'free', 'daily', 'weekly', 'monthly', 'annual', 'lifetime'

ALTER TABLE users ADD COLUMN free_exports_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN free_exports_reset_date TIMESTAMP;
ALTER TABLE users ADD COLUMN ai_credits_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ai_credits_reset_date TIMESTAMP;
```

**Create usage_limits table:**
```sql
CREATE TABLE usage_limits (
  id SERIAL PRIMARY KEY,
  tier VARCHAR(50) NOT NULL,
  feature VARCHAR(100) NOT NULL,
  limit_value INTEGER, -- NULL = unlimited
  period VARCHAR(50), -- 'day', 'week', 'month', NULL for lifetime
  created_at TIMESTAMP DEFAULT NOW()
);

-- Free tier limits
INSERT INTO usage_limits (tier, feature, limit_value, period) VALUES
('free', 'resumes', 3, NULL),           -- 3 resumes total
('free', 'pdf_exports', 1, 'month'),    -- 1 PDF/month
('free', 'ai_suggestions', 5, 'month'), -- 5 AI calls/month
('free', 'templates', 3, NULL),         -- 3 basic templates
('free', 'ats_score', 1, NULL);         -- Basic score only (no details)

-- Paid tier limits (NULL = unlimited)
INSERT INTO usage_limits (tier, feature, limit_value, period) VALUES
('daily', 'resumes', NULL, NULL),
('daily', 'pdf_exports', NULL, NULL),
('daily', 'ai_suggestions', NULL, NULL),
('weekly', 'resumes', NULL, NULL),
-- ... etc for all paid tiers
```

### 1.2 Backend Middleware Changes

**New middleware: `backend/src/middleware/featureAccess.js`**

```javascript
// Feature access control based on subscription tier
export function requireFeatureAccess(feature, options = {}) {
  return async (req, res, next) => {
    const user = req.user;
    const tier = user?.subscription_tier || 'free';

    // Check if subscription is still valid (for paid tiers)
    if (tier !== 'free' && tier !== 'lifetime') {
      if (!user.subscription_end_date || new Date(user.subscription_end_date) < new Date()) {
        // Subscription expired, downgrade to free
        await query('UPDATE users SET subscription_tier = $1 WHERE id = $2', ['free', user.id]);
        user.subscription_tier = 'free';
      }
    }

    // Get limit for this feature and tier
    const limitResult = await query(
      'SELECT limit_value, period FROM usage_limits WHERE tier = $1 AND feature = $2',
      [tier, feature]
    );

    const limit = limitResult.rows[0];

    // No limit found = blocked, unlimited if limit_value is NULL
    if (!limit) {
      return res.status(403).json({
        error: 'Feature not available',
        upgrade_required: true,
        feature
      });
    }

    if (limit.limit_value === null) {
      return next(); // Unlimited access
    }

    // Check usage against limit
    const usage = await getUserUsage(user.id, feature, limit.period);

    if (usage >= limit.limit_value) {
      return res.status(403).json({
        error: 'Limit reached',
        upgrade_required: true,
        feature,
        usage,
        limit: limit.limit_value,
        period: limit.period,
        reset_date: getResetDate(limit.period)
      });
    }

    // Attach limit info for optional frontend display
    req.featureLimit = { usage, limit: limit.limit_value, period: limit.period };
    next();
  };
}
```

### 1.3 Route Changes

**Update resume routes to use feature access:**

```javascript
// backend/src/routes/resumes.js
import { requireFeatureAccess } from '../middleware/featureAccess.js';

// Creating resume - check resume limit
router.post('/', authenticate, requireFeatureAccess('resumes'), async (req, res) => {
  // ... existing create logic
});

// Reading resumes - allow all authenticated users
router.get('/', authenticate, async (req, res) => {
  // ... existing read logic (FREE users can see their resumes)
});

// Exporting resume - check export limit
router.get('/:id/export', authenticate, requireFeatureAccess('pdf_exports'), async (req, res) => {
  // ... existing export logic
  // Increment usage after successful export
  await incrementUsage(req.user.id, 'pdf_exports');
});
```

**Update AI routes:**

```javascript
// backend/src/routes/ai.js
router.post('/improve-summary', authenticate, requireFeatureAccess('ai_suggestions'), async (req, res) => {
  // ... existing logic
  await incrementUsage(req.user.id, 'ai_suggestions');
});
```

### 1.4 Frontend Changes

**Update subscription check logic:**

```javascript
// frontend/src/hooks/useSubscription.js (new file)
export function useSubscription() {
  const { currentUser } = useAuth();

  const tier = currentUser?.subscription_tier || 'free';
  const isPaid = ['daily', 'weekly', 'monthly', 'annual', 'lifetime'].includes(tier);

  // Check if paid subscription is still valid
  const isActive = isPaid && (
    tier === 'lifetime' ||
    (currentUser?.subscription_end_date && new Date(currentUser.subscription_end_date) > new Date())
  );

  return {
    tier,
    isPaid,
    isActive,
    isFree: tier === 'free' || !isActive
  };
}
```

**Update MyResumes.jsx:**
- Remove hard lock on all resumes
- Show resumes to free users
- Disable export/AI buttons when limits reached
- Show upgrade prompts at limit boundaries

---

## Phase 2: Pricing Tier Updates (Week 1-2)

### 2.1 Add New Plans to Database

```sql
-- Annual Plan
INSERT INTO subscription_plans (plan_id, name, price, period, duration, features, is_active) VALUES
('annual', 'Annual Plan', 99.00, 'year', 365,
 '{"resumes": "unlimited", "exports": "unlimited", "ai": "unlimited", "templates": "all", "ats": "detailed", "support": "priority"}',
 true);

-- Lifetime Plan
INSERT INTO subscription_plans (plan_id, name, price, period, duration, features, is_active) VALUES
('lifetime', 'Lifetime Access', 149.00, 'lifetime', NULL,
 '{"resumes": "unlimited", "exports": "unlimited", "ai": "unlimited", "templates": "all", "ats": "detailed", "support": "priority", "updates": "lifetime"}',
 true);
```

### 2.2 Create Stripe Products/Prices

Via Stripe Dashboard or API:
- Annual: $99/year recurring
- Lifetime: $149 one-time payment

### 2.3 Update Pricing Page

Show clear value hierarchy:
1. **Free** - Build up to 3 resumes, 1 PDF/month, 5 AI suggestions/month
2. **Daily** - $0.99 (existing) - Perfect for urgent applications
3. **Weekly** - $6.49 (existing) - Most popular, active job search
4. **Monthly** - $29.99 (existing) - Extended job search
5. **Annual** - $99/year (NEW) - Save 72%, update resumes anytime
6. **Lifetime** - $149 (NEW) - One-time, never pay again

---

## Phase 3: Conversion Triggers (Week 2)

### 3.1 Strategic Upgrade Prompts

**Trigger Points:**
1. **Resume limit reached** - "You've created 3 resumes. Upgrade for unlimited."
2. **Export limit reached** - "You've used your free PDF this month. Upgrade for unlimited exports."
3. **AI limit reached** - "5/5 AI suggestions used. Upgrade for unlimited AI assistance."
4. **Premium template selected** - "This template requires a premium subscription."
5. **ATS details requested** - "Your score is 72/100. Upgrade to see exactly how to improve it."

### 3.2 Upgrade Modal Component

```jsx
// frontend/src/components/UpgradeModal.jsx
function UpgradeModal({ trigger, onClose }) {
  const messages = {
    resume_limit: {
      title: "Resume Limit Reached",
      subtitle: "You've created 3 resumes on the free plan",
      cta: "Upgrade for unlimited resumes"
    },
    export_limit: {
      title: "Export Limit Reached",
      subtitle: "You've used your 1 free PDF export this month",
      cta: "Upgrade for unlimited exports"
    },
    ai_limit: {
      title: "AI Credits Depleted",
      subtitle: "You've used all 5 AI suggestions this month",
      cta: "Upgrade for unlimited AI assistance"
    }
  };

  return (
    <Modal>
      <h2>{messages[trigger].title}</h2>
      <p>{messages[trigger].subtitle}</p>
      <div className="pricing-options">
        <PlanCard plan="weekly" highlight />
        <PlanCard plan="monthly" />
        <PlanCard plan="annual" badge="Best Value" />
      </div>
    </Modal>
  );
}
```

### 3.3 Watermark on Free Exports

Add subtle "Made with Resumakr.us" footer on free PDF exports:
- Small, professional footer text
- Removed for paid users
- Drives organic traffic when resumes are shared

---

## Phase 4: Public Landing Page (Week 2-3)

### 4.1 Landing Page Structure

**URL:** `https://resumakr.us/` (not redirect to app)

**Sections:**
1. **Hero** - Value prop, CTA "Start Building Free"
2. **Features** - AI-powered, ATS optimization, templates, privacy
3. **How It Works** - 3-step process
4. **Templates** - Preview gallery
5. **Pricing** - All tiers with feature comparison
6. **Testimonials** - User success stories
7. **FAQ** - Common questions
8. **Footer** - Links, social proof

### 4.2 SEO Optimization

**Target keywords:**
- "free resume builder"
- "AI resume builder"
- "ATS resume builder"
- "resume builder online"

**Meta tags:**
```html
<title>Resumakr - Free AI Resume Builder | ATS-Optimized Templates</title>
<meta name="description" content="Build professional resumes for free with AI assistance. ATS-optimized templates, instant PDF export. Start building your resume now - no credit card required.">
```

### 4.3 Implementation Options

**Option A:** Static landing page (Recommended)
- Create `frontend/src/pages/Landing.jsx`
- Serve at `/` for non-authenticated users
- Fast, SEO-friendly

**Option B:** Separate marketing site
- Use Next.js or Astro for better SEO
- Deploy to `resumakr.us`, app stays at `app.resumakr.us`

---

## Phase 5: Blog Infrastructure (Week 3-4)

### 5.1 Blog Setup

**Option A:** Built-in blog (Simpler)
- Add `/blog` route to frontend
- Store posts in database or MDX files
- Good for starting, limited SEO

**Option B:** External blog (Better SEO)
- Use Ghost, WordPress, or Hashnode
- Subdomain: `blog.resumakr.us`
- Better for long-term SEO

### 5.2 Initial Content Plan

**Week 1-2: Foundational articles (10 posts)**
1. "How to Write a Resume in 2026 (Complete Guide)"
2. "What is an ATS? Why Your Resume Gets Rejected"
3. "Resume vs CV: What's the Difference?"
4. "10 Resume Mistakes That Cost You Interviews"
5. "How to Tailor Your Resume for Each Job"
6. "Resume Summary vs Objective: Which to Use"
7. "How Many Pages Should a Resume Be?"
8. "Best Resume Fonts for 2026"
9. "How to List Skills on a Resume"
10. "How to Write a Resume with No Experience"

**Week 3-4: Job-specific examples (10 posts)**
- Software Engineer Resume Guide
- Nurse Resume Guide
- Teacher Resume Guide
- Marketing Manager Resume Guide
- Project Manager Resume Guide
- (5 more based on search volume)

---

## Implementation Timeline

### Week 1: Core Product Changes
- [ ] Database migrations for tier system
- [ ] Feature access middleware
- [ ] Update resume/AI routes
- [ ] Frontend subscription hooks
- [ ] Add annual + lifetime plans in Stripe

### Week 2: Conversion & Polish
- [ ] Upgrade modal component
- [ ] Conversion trigger points
- [ ] Watermark on free exports
- [ ] Update pricing page UI
- [ ] Test full user journey

### Week 3: Landing Page
- [ ] Design landing page
- [ ] Implement landing page
- [ ] SEO optimization
- [ ] Set up analytics (Plausible/GA4)
- [ ] Social proof elements

### Week 4: Content Foundation
- [ ] Blog infrastructure decision
- [ ] Write first 5 articles
- [ ] LinkedIn launch post
- [ ] First Reddit posts (value-first)
- [ ] Gather initial testimonials

---

## Success Metrics

### Week 4
- Free tier implemented and tested
- 100+ new signups
- First 5-10 paid conversions
- Landing page live

### Month 3
- 1,000+ free users
- 2-3% conversion rate
- $500-1,000 MRR
- 20+ published articles
- 5,000+ monthly visitors

### Month 6
- 5,000+ free users
- 3-4% conversion rate
- $2,000-4,000 MRR
- 50+ published articles
- 15,000+ monthly visitors

### Month 12
- 15,000-25,000 free users
- 3-5% conversion rate
- $5,000-10,000 MRR
- 100+ published articles
- 50,000+ monthly visitors

---

## Risk Mitigation

### Risk: Free tier cannibalizes paid users
**Mitigation:** Strategic limits that don't feel punishing but create natural upgrade moments. 1 PDF/month is generous for casual users, limiting for active job seekers.

### Risk: AI costs increase without revenue
**Mitigation:** 5 AI calls/month for free tier caps costs. Track cost per user.

### Risk: Abuse/spam signups
**Mitigation:** Email verification, rate limiting, CAPTCHA if needed.

### Risk: Slow SEO results
**Mitigation:** Reddit and LinkedIn provide faster initial traffic while SEO compounds.

---

## Files to Modify/Create

### Backend
- `backend/migrations/XXX_add_tier_system.sql` (new)
- `backend/src/middleware/featureAccess.js` (new)
- `backend/src/middleware/auth.js` (update)
- `backend/src/routes/resumes.js` (update)
- `backend/src/routes/ai.js` (update)
- `backend/src/routes/subscriptions.js` (update)

### Frontend
- `frontend/src/hooks/useSubscription.js` (new)
- `frontend/src/components/UpgradeModal.jsx` (new)
- `frontend/src/pages/Landing.jsx` (new)
- `frontend/src/pages/MyResumes.jsx` (update)
- `frontend/src/pages/Pricing.jsx` (update)
- `frontend/src/pages/index.jsx` (update routes)

---

*This plan prioritizes high-impact, low-effort changes first. The free tier is the foundation—everything else builds on it.*
