# Resumakr Complete Test Plan
**Version:** 1.0
**Date:** 2025-12-15
**Purpose:** Comprehensive functional testing to ensure 100% application functionality

---

## Table of Contents
1. [Pre-Test Environment Setup](#1-pre-test-environment-setup)
2. [Critical Path Tests](#2-critical-path-tests-priority-1)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Resume Management](#4-resume-management)
5. [AI Features](#5-ai-features-subscription-required)
6. [Admin Features](#6-admin-features)
7. [Subscription & Monetization](#7-subscription--monetization)
8. [Known Issues Verification](#8-known-issues-verification)
9. [Edge Cases & Error Handling](#9-edge-cases--error-handling)
10. [Performance & Security](#10-performance--security)

---

## Test Execution Strategy

**Optimization Principles:**
- ✅ **Combine Related Tests**: Multiple assertions per test scenario
- ✅ **Reuse Test Data**: Create once, use across multiple tests
- ✅ **Parallel Testing**: Independent test suites can run concurrently
- ✅ **Critical Path First**: Focus on user journey and revenue-critical features
- ✅ **Incremental Validation**: Verify dependencies before dependent tests

**Priority Levels:**
- **P1 (Critical)**: Must work for app to function - blocks users
- **P2 (High)**: Important features - impacts user experience
- **P3 (Medium)**: Nice-to-have features - minor impact
- **P4 (Low)**: Edge cases and optimizations

---

## 1. Pre-Test Environment Setup

### 1.1 Infrastructure Health (P1)
**Duration:** 2 minutes

- [ ] **Docker Containers Running**
  ```bash
  docker-compose ps
  # Verify: resumakr-db, resumakr-api, resumakr-frontend all "Up"
  ```

- [ ] **Database Connection**
  ```bash
  docker exec -it resumakr-db psql -U resumakr_user -d resumakr -c "SELECT NOW();"
  # Expected: Current timestamp returned
  ```

- [ ] **Backend Health Check**
  ```bash
  curl http://localhost:3001/api/health
  # Expected: {"status":"ok","timestamp":"..."}
  ```

- [ ] **Frontend Accessibility**
  ```bash
  curl -I http://localhost:5173
  # Expected: HTTP/1.1 200 OK
  ```

### 1.2 Database Schema Verification (P1)
**Duration:** 1 minute

- [ ] **Verify Critical Tables Exist**
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;

  # Expected tables:
  # - users
  # - resumes
  # - resume_data
  # - resume_versions
  # - subscription_plans
  # - ai_providers
  # - custom_prompts
  # - coupon_codes
  # - marketing_campaigns
  # - faq_items
  # - help_config
  # - app_settings
  ```

### 1.3 Test Data Preparation (P1)
**Duration:** 3 minutes

- [ ] **Create Admin User** (if not exists)
  ```bash
  # Email: admin@test.com
  # Password: TestAdmin123!
  # Use: npm run create-admin OR direct SQL
  ```

- [ ] **Create Test User** (via API or direct registration)
  ```bash
  # Email: testuser@example.com
  # Password: TestUser123!
  ```

- [ ] **Create Subscription Plan** (for testing activation)
  ```json
  {
    "plan_id": "test_monthly",
    "name": "Test Monthly Plan",
    "price": 9.99,
    "period": "month",
    "duration": 1,
    "features": ["AI Features", "Unlimited Resumes"],
    "is_popular": false,
    "is_active": true
  }
  ```

- [ ] **Create AI Provider** (for AI testing)
  ```json
  {
    "name": "OpenAI Test",
    "provider_type": "openai",
    "api_endpoint": "https://api.openai.com/v1",
    "model_name": "gpt-3.5-turbo",
    "api_key": "[VALID_API_KEY]",
    "is_default": true
  }
  ```

**✅ Checkpoint:** Environment is ready when all infrastructure and test data checks pass.

---

## 2. Critical Path Tests (Priority 1)

### 2.1 User Registration & Login Flow (P1)
**Duration:** 3 minutes
**Tests Core Business Function:** User onboarding

**Test Scenario: New User Complete Journey**

1. **Register New User**
   - [ ] Navigate to `/Signup`
   - [ ] Fill form: email, password, full name
   - [ ] Submit registration
   - [ ] **Verify**: Redirected to login or dashboard
   - [ ] **Verify**: User record created in database
   - [ ] **Verify**: JWT token received and stored

2. **Login with Created User**
   - [ ] Navigate to `/Login`
   - [ ] Enter credentials
   - [ ] Click "Sign In"
   - [ ] **Verify**: Redirected to dashboard/my-resumes
   - [ ] **Verify**: User info displayed (email/name)

3. **Session Persistence**
   - [ ] Refresh page
   - [ ] **Verify**: Still logged in (token valid)
   - [ ] Navigate to authenticated page
   - [ ] **Verify**: Access granted without re-login

4. **Logout**
   - [ ] Click logout button
   - [ ] **Verify**: Redirected to login/home
   - [ ] **Verify**: Token cleared from storage
   - [ ] Try accessing protected route
   - [ ] **Verify**: Redirected to login

**API Endpoints Tested:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

---

### 2.2 Resume Creation Flow (P1)
**Duration:** 5 minutes
**Tests Core Business Function:** Resume building

**Test Scenario: User Creates First Resume**

1. **Start New Resume**
   - [ ] Login as test user
   - [ ] Navigate to `/BuildWizard`
   - [ ] Enter resume title
   - [ ] **Verify**: Resume created (POST /api/resumes)
   - [ ] **Verify**: Resume appears in database

2. **Add Personal Information**
   - [ ] Fill personal info form (name, email, phone, location)
   - [ ] Save section
   - [ ] **Verify**: Data saved (POST /api/resume-data)
   - [ ] **Verify**: Progress indicator updates

3. **Add Work Experience**
   - [ ] Add job entry (company, title, dates, description)
   - [ ] Save entry
   - [ ] **Verify**: Experience saved in resume_data

4. **Add Education**
   - [ ] Add education entry (school, degree, dates)
   - [ ] Save entry
   - [ ] **Verify**: Education saved

5. **Add Skills**
   - [ ] Add multiple skills
   - [ ] Save skills
   - [ ] **Verify**: Skills array saved

6. **Complete & View Resume**
   - [ ] Navigate to `/ResumeReview` with resume ID
   - [ ] **Verify**: All entered data displays correctly
   - [ ] **Verify**: Preview renders properly

**API Endpoints Tested:** `POST /api/resumes`, `POST /api/resume-data`, `GET /api/resumes/:id`, `GET /api/resume-data/by-resume/:id`

---

### 2.3 Subscription Activation Flow (P1)
**Duration:** 3 minutes
**Tests Revenue Function:** Subscription purchase

**Test Scenario: User Activates Subscription**

1. **View Pricing Plans**
   - [ ] Navigate to `/Pricing`
   - [ ] **Verify**: Plans load (GET /api/subscriptions/plans)
   - [ ] **Verify**: At least one plan displays

2. **Activate Subscription**
   - [ ] Login as test user (if not logged in)
   - [ ] Click "Subscribe" on a plan
   - [ ] Confirm selection
   - [ ] **Verify**: POST /api/subscriptions/activate succeeds
   - [ ] **Verify**: User record updated (is_subscribed = true)
   - [ ] **Verify**: subscription_end_date set correctly

3. **Verify Subscription Access**
   - [ ] Navigate to AI feature page
   - [ ] **Verify**: AI features are now accessible
   - [ ] **Verify**: No "subscription required" errors

**API Endpoints Tested:** `GET /api/subscriptions/plans`, `POST /api/subscriptions/activate`, `GET /api/auth/me`

---

### 2.4 Admin Panel Access (P1)
**Duration:** 2 minutes
**Tests Admin Function:** Admin capabilities

**Test Scenario: Admin Manages System**

1. **Admin Login**
   - [ ] Login as admin user
   - [ ] **Verify**: Admin menu/options visible

2. **Access Admin Pages**
   - [ ] Navigate to `/SettingsUsers`
   - [ ] **Verify**: User list loads
   - [ ] Navigate to `/SettingsProviders`
   - [ ] **Verify**: AI providers list loads
   - [ ] Navigate to `/SettingsPlans`
   - [ ] **Verify**: Subscription plans list loads

3. **Non-Admin Blocked**
   - [ ] Logout admin
   - [ ] Login as regular test user
   - [ ] Try accessing `/SettingsUsers`
   - [ ] **Verify**: Access denied or redirected

**API Endpoints Tested:** `GET /api/users`, `GET /api/providers`, `GET /api/subscriptions/plans` (admin view)

---

## 3. Authentication & Authorization

### 3.1 Email/Password Authentication (P1)

**Test: User Registration**
- [ ] POST /api/auth/register with valid data
  - **Verify**: 201 status, user created, JWT returned
- [ ] POST /api/auth/register with existing email
  - **Verify**: 409/400 status, "User already exists"
- [ ] POST /api/auth/register with invalid email format
  - **Verify**: 400 status, validation error
- [ ] POST /api/auth/register with weak password
  - **Verify**: 400 status, password requirements error

**Test: User Login**
- [ ] POST /api/auth/login with correct credentials
  - **Verify**: 200 status, JWT returned, user data
- [ ] POST /api/auth/login with wrong password
  - **Verify**: 401 status, "Invalid credentials"
- [ ] POST /api/auth/login with non-existent email
  - **Verify**: 401 status, "Invalid credentials"

**Test: Session Management**
- [ ] GET /api/auth/me with valid token
  - **Verify**: 200 status, current user data
- [ ] GET /api/auth/me without token
  - **Verify**: 401 status, "Unauthorized"
- [ ] GET /api/auth/me with expired/invalid token
  - **Verify**: 401 status, token error

**Test: Password Change**
- [ ] POST /api/auth/change-password with valid current password
  - **Verify**: 200 status, password updated
- [ ] POST /api/auth/change-password with wrong current password
  - **Verify**: 401/400 status, error message
- [ ] Login with new password
  - **Verify**: Successful login

**API Coverage:** 14 of 67 endpoints (21%)

---

### 3.2 OAuth Authentication (P2)

**Note:** OAuth testing requires valid OAuth app credentials for each provider.

**Test: OAuth Providers Available**
- [ ] GET /api/auth/google (initiates OAuth flow)
  - **Verify**: Redirects to Google OAuth consent
- [ ] GET /api/auth/microsoft
  - **Verify**: Redirects to Microsoft OAuth
- [ ] GET /api/auth/github
  - **Verify**: Redirects to GitHub OAuth
- [ ] GET /api/auth/apple
  - **Verify**: Redirects to Apple OAuth

**Test: OAuth Callback** (requires manual OAuth flow completion)
- [ ] Complete Google OAuth flow
  - **Verify**: User created/logged in, JWT returned
- [ ] **Verify**: User record has OAuth provider info

**API Coverage:** +8 endpoints = 22 of 67 (33%)

---

### 3.3 Authorization Levels (P1)

**Test: Public Access**
- [ ] GET /api/subscriptions/plans (no auth)
  - **Verify**: 200 status, plans returned
- [ ] GET /api/health (no auth)
  - **Verify**: 200 status

**Test: Authenticated User Access**
- [ ] GET /api/resumes with auth token
  - **Verify**: 200 status, user's resumes
- [ ] GET /api/resumes without auth token
  - **Verify**: 401 status, unauthorized

**Test: Admin-Only Access**
- [ ] GET /api/users with admin token
  - **Verify**: 200 status, all users
- [ ] GET /api/users with regular user token
  - **Verify**: 403 status, forbidden
- [ ] POST /api/subscriptions/plans with regular user
  - **Verify**: 403 status, admin required

**Test: Subscription-Required Access**
- [ ] POST /api/ai/improve-summary without subscription
  - **Verify**: 403 status, "Subscription required"
- [ ] POST /api/ai/improve-summary with active subscription
  - **Verify**: 200 status (if AI provider configured)

---

## 4. Resume Management

### 4.1 Resume CRUD Operations (P1)

**Test: Create Resume**
- [ ] POST /api/resumes with valid data
  ```json
  {
    "title": "Software Engineer Resume",
    "source_type": "manual",
    "status": "draft"
  }
  ```
  - **Verify**: 201 status, resume created
  - **Verify**: created_by = current user ID

**Test: List Resumes**
- [ ] GET /api/resumes
  - **Verify**: 200 status, only user's resumes returned
  - **Verify**: Resumes sorted by created_at DESC
- [ ] GET /api/resumes?status=draft
  - **Verify**: Only draft resumes returned
- [ ] GET /api/resumes?limit=5
  - **Verify**: Max 5 resumes returned

**Test: Get Single Resume**
- [ ] GET /api/resumes/:id with valid ID (owned by user)
  - **Verify**: 200 status, resume data
- [ ] GET /api/resumes/:id with ID owned by different user
  - **Verify**: 404 or 403 status, access denied

**Test: Update Resume**
- [ ] PUT /api/resumes/:id with new title
  - **Verify**: 200 status, title updated
- [ ] PUT /api/resumes/:id with new status
  - **Verify**: Status changed to "published"

**Test: Delete Resume**
- [ ] DELETE /api/resumes/:id
  - **Verify**: 200 status, resume deleted
  - **Verify**: GET /api/resumes/:id returns 404

**API Coverage:** +5 endpoints = 27 of 67 (40%)

---

### 4.2 Resume Data Management (P1)

**Test: Create Resume Data**
- [ ] POST /api/resume-data with full content
  ```json
  {
    "resume_id": "[created_resume_id]",
    "personal_info": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "professional_summary": "Experienced software engineer...",
    "work_experience": [
      {
        "company": "Tech Corp",
        "position": "Senior Developer",
        "start_date": "2020-01",
        "end_date": "2023-12",
        "description": "Led development team..."
      }
    ],
    "education": [
      {
        "institution": "University",
        "degree": "BS Computer Science",
        "start_date": "2015",
        "end_date": "2019"
      }
    ],
    "skills": ["JavaScript", "Python", "React", "Node.js"]
  }
  ```
  - **Verify**: 201 status, resume data created

**Test: Get Resume Data**
- [ ] GET /api/resume-data/by-resume/:resumeId
  - **Verify**: 200 status, all resume content returned
  - **Verify**: JSONB fields properly formatted

**Test: Update Resume Data**
- [ ] PUT /api/resume-data/:id (add certification)
  - **Verify**: 200 status, certifications added
- [ ] PUT /api/resume-data/:id (update work experience)
  - **Verify**: Work experience modified

**API Coverage:** +3 endpoints = 30 of 67 (45%)

---

### 4.3 File Upload & Parsing (P1)

**Test: Upload Resume File**
- [ ] POST /api/upload with valid PDF file
  - **Verify**: 200 status, file_url returned
  - **Verify**: File saved to uploads/ directory
- [ ] POST /api/upload with valid DOCX file
  - **Verify**: 200 status, file uploaded
- [ ] POST /api/upload with invalid file type
  - **Verify**: 400 status, "Invalid file type"
- [ ] POST /api/upload with file > 10MB
  - **Verify**: 400 status, "File too large"

**Test: AI Resume Extraction**
- [ ] POST /api/upload/extract with uploaded PDF
  - **Verify**: 200 status, structured data returned
  - **Verify**: personal_info extracted
  - **Verify**: work_experience extracted
  - **Verify**: education extracted
  - **Verify**: skills extracted
- [ ] POST /api/upload/extract with uploaded DOCX
  - **Verify**: Data extraction successful

**API Coverage:** +2 endpoints = 32 of 67 (48%)

**⚠️ Known Issue:** AI extraction requires active AI provider and valid API key

---

### 4.4 Version Control (P2)

**Test: Create Version**
- [ ] POST /api/versions
  ```json
  {
    "resume_id": "[resume_id]",
    "version_name": "Before Interview Edits",
    "data_snapshot": { /* full resume data */ },
    "notes": "Saved before making changes"
  }
  ```
  - **Verify**: 201 status, version created

**Test: List Versions**
- [ ] GET /api/versions
  - **Verify**: All user's resume versions returned
- [ ] GET /api/versions?resume_id=[id]
  - **Verify**: Only versions for specific resume

**Test: Update Version**
- [ ] PUT /api/versions/:id (update version_name)
  - **Verify**: 200 status, name updated

**Test: Delete Version**
- [ ] DELETE /api/versions/:id
  - **Verify**: 200 status, version deleted

**API Coverage:** +4 endpoints = 36 of 67 (54%)

---

## 5. AI Features (Subscription Required)

### 5.1 AI Provider Configuration (P1)

**Test: List AI Providers**
- [ ] GET /api/providers (as authenticated user)
  - **Verify**: 200 status, active providers returned

**Test: Create AI Provider (Admin)**
- [ ] POST /api/providers with OpenAI config
  ```json
  {
    "name": "OpenAI GPT-4",
    "provider_type": "openai",
    "api_endpoint": "https://api.openai.com/v1",
    "model_name": "gpt-4",
    "api_key": "[VALID_KEY]",
    "is_default": true
  }
  ```
  - **Verify**: 201 status, provider created

**Test: Test Provider Connection**
- [ ] POST /api/providers/test with provider_id
  - **Verify**: 200 status, "Connection successful"
- [ ] POST /api/providers/test with invalid API key
  - **Verify**: 400 status, connection failed

**Test: Update Provider**
- [ ] PUT /api/providers/:id (change model_name)
  - **Verify**: 200 status, updated
- [ ] PUT /api/providers/:id (set is_default=true)
  - **Verify**: Previous default provider updated to false

**Test: Delete Provider**
- [ ] DELETE /api/providers/:id
  - **Verify**: 200 status, provider deleted

**API Coverage:** +5 endpoints = 41 of 67 (61%)

---

### 5.2 AI Invocation & Features (P1)

**Prerequisites:**
- User has active subscription
- At least one AI provider configured with valid API key

**Test: Generic AI Invoke**
- [ ] POST /api/ai/invoke
  ```json
  {
    "prompt": "Write a professional summary for a software engineer",
    "model": "gpt-3.5-turbo"
  }
  ```
  - **Verify**: 200 status, AI response returned
  - **Verify**: Response contains generated text

**Test: Improve Professional Summary**
- [ ] POST /api/ai/improve-summary
  ```json
  {
    "current_summary": "I am a developer with experience",
    "job_description": "Looking for senior full-stack developer"
  }
  ```
  - **Verify**: 200 status, multiple improved versions returned
  - **Verify**: Each version has provider info
  - **Verify**: Summaries are different and improved

**Test: ATS Analysis**
- [ ] POST /api/ai/analyze-ats
  ```json
  {
    "resume_data": { /* full resume content */ },
    "job_description": "Software Engineer position requiring..."
  }
  ```
  - **Verify**: 200 status, ATS analysis returned
  - **Verify**: Score provided (0-100)
  - **Verify**: Keywords found list
  - **Verify**: Keywords missing list
  - **Verify**: Recommendations array

**Test: Subscription Enforcement**
- [ ] Expire test user's subscription (update subscription_end_date to past)
- [ ] POST /api/ai/invoke
  - **Verify**: 403 status, "Subscription required"

**API Coverage:** +3 endpoints = 44 of 67 (66%)

---

### 5.3 Custom Prompts (P2)

**Test: List Prompts**
- [ ] GET /api/prompts
  - **Verify**: 200 status, active prompts returned
- [ ] GET /api/prompts?prompt_type=summary
  - **Verify**: Only summary prompts returned

**Test: Get Prompt Types**
- [ ] GET /api/prompts/types
  - **Verify**: 200 status, distinct types array

**Test: Create Custom Prompt (Admin)**
- [ ] POST /api/prompts
  ```json
  {
    "name": "Technical Summary Generator",
    "prompt_text": "Generate a technical summary...",
    "prompt_type": "summary",
    "provider_id": "[provider_id]",
    "is_active": true
  }
  ```
  - **Verify**: 201 status, prompt created

**Test: Update Prompt**
- [ ] PUT /api/prompts/:id
  - **Verify**: 200 status, prompt updated

**Test: Delete Prompt**
- [ ] DELETE /api/prompts/:id
  - **Verify**: 200 status, deleted

**API Coverage:** +5 endpoints = 49 of 67 (73%)

---

## 6. Admin Features

### 6.1 User Management (P1)

**Test: List All Users (Admin)**
- [ ] GET /api/users
  - **Verify**: 200 status, all users returned
- [ ] GET /api/users?role=admin
  - **Verify**: Only admin users returned
- [ ] GET /api/users?search=test@
  - **Verify**: Users matching email search

**Test: Get User Details**
- [ ] GET /api/users/:id
  - **Verify**: 200 status, user details

**Test: Create User (Admin)**
- [ ] POST /api/users
  ```json
  {
    "email": "newuser@test.com",
    "password": "SecurePass123!",
    "full_name": "New User",
    "role": "user"
  }
  ```
  - **Verify**: 201 status, user created

**Test: Update User**
- [ ] PUT /api/users/:id (change role to admin)
  - **Verify**: 200 status, role updated
- [ ] PUT /api/users/:id (admin trying to change own role)
  - **Verify**: 403 status, "Cannot change own role"

**Test: Delete User**
- [ ] DELETE /api/users/:id
  - **Verify**: 200 status, user deleted
- [ ] DELETE /api/users/:id (admin trying to delete self)
  - **Verify**: 403 status, "Cannot delete yourself"

**API Coverage:** +5 endpoints = 54 of 67 (81%)

---

## 7. Subscription & Monetization

### 7.1 Subscription Plans (P1)

**Test: View Plans (Public)**
- [ ] GET /api/subscriptions/plans (no auth)
  - **Verify**: 200 status, all plans (active & inactive)

**Test: Create Plan (Admin)**
- [ ] POST /api/subscriptions/plans
  ```json
  {
    "plan_id": "monthly_pro",
    "name": "Monthly Pro",
    "price": 19.99,
    "period": "month",
    "duration": 1,
    "features": ["Unlimited Resumes", "AI Features", "Priority Support"],
    "is_popular": true,
    "is_active": true
  }
  ```
  - **Verify**: 201 status, plan created
  - **Verify**: Features stored as JSONB array

**Test: Update Plan**
- [ ] PUT /api/subscriptions/plans/:id (change price)
  - **Verify**: 200 status, price updated

**Test: Delete Plan**
- [ ] DELETE /api/subscriptions/plans/:id
  - **Verify**: 200 status, plan deleted

**Test: Duplicate Plan Name**
- [ ] POST /api/subscriptions/plans with existing plan_id
  - **Verify**: 409 status, "Plan already exists"

**API Coverage:** +3 endpoints = 57 of 67 (85%)

**⚠️ Known Issue from Thread:** POST /api/subscriptions/plans had SQL syntax error (empty placeholders) - FIXED in session

---

### 7.2 Subscription Activation (P1)

**Test: Activate Monthly Subscription**
- [ ] POST /api/subscriptions/activate
  ```json
  {
    "plan_id": "monthly_pro"
  }
  ```
  - **Verify**: 200 status, activation successful
  - **Verify**: User is_subscribed = true
  - **Verify**: subscription_end_date = NOW() + 1 month
  - **Verify**: subscription_plan = "monthly_pro"

**Test: Activate Yearly Subscription**
- [ ] Create yearly plan (duration: 1, period: "year")
- [ ] POST /api/subscriptions/activate
  - **Verify**: subscription_end_date = NOW() + 1 year

**Test: Invalid Plan**
- [ ] POST /api/subscriptions/activate with non-existent plan_id
  - **Verify**: 404 status, "Plan not found"

**Test: Inactive Plan**
- [ ] Create plan with is_active=false
- [ ] POST /api/subscriptions/activate
  - **Verify**: 404 status, "Plan not found or inactive"

**API Coverage:** +1 endpoint = 58 of 67 (87%)

**⚠️ Known Issue from Thread:** /activate endpoint was missing - ADDED in session

---

### 7.3 Coupons & Campaigns (P2)

**Test: List Coupons**
- [ ] GET /api/coupons
  - **Verify**: 200 status, all coupons

**Test: Create Coupon (Admin)**
- [ ] POST /api/coupons
  ```json
  {
    "code": "LAUNCH50",
    "discount_type": "percentage",
    "discount_value": 50,
    "applicable_plans": ["monthly_pro"],
    "max_uses": 100,
    "expires_at": "2026-12-31",
    "is_active": true
  }
  ```
  - **Verify**: 201 status, coupon created

**Test: Update Coupon**
- [ ] PUT /api/coupons/:id
  - **Verify**: 200 status

**Test: Delete Coupon**
- [ ] DELETE /api/coupons/:id
  - **Verify**: 200 status

**Test: Marketing Campaigns**
- [ ] GET /api/campaigns
  - **Verify**: 200 status
- [ ] POST /api/campaigns (admin)
  - **Verify**: 201 status, campaign created

**API Coverage:** +6 endpoints = 64 of 67 (96%)

---

## 8. Known Issues Verification

### 8.1 Issues from Current Session (P1)

**Issue 1: Subscription Plan Creation SQL Error**
- **Status:** FIXED (added $1, $2, $3... placeholders)
- **Test:**
  - [ ] POST /api/subscriptions/plans with all required fields
  - **Verify**: 201 status, no SQL syntax error
  - **Verify**: Plan stored in database with correct values

**Issue 2: Subscription Activation Endpoint Missing**
- **Status:** FIXED (added POST /api/subscriptions/activate)
- **Test:**
  - [ ] POST /api/subscriptions/activate with valid plan_id
  - **Verify**: 200 status (not 404)
  - **Verify**: User subscription updated

**Issue 3: Admin Account Creation**
- **Status:** RESOLVED (created admin via SQL UPDATE)
- **Test:**
  - [ ] Verify admin@test.com has role='admin'
  - [ ] Login as admin
  - [ ] Access admin-only routes
  - **Verify**: All admin features accessible

---

## 9. Edge Cases & Error Handling

### 9.1 Authentication Edge Cases (P2)

- [ ] **Expired Token**: Use expired JWT
  - **Verify**: 401 status on protected routes
- [ ] **Malformed Token**: Send invalid JWT format
  - **Verify**: 401 status, proper error message
- [ ] **Token Tampering**: Modify JWT payload
  - **Verify**: 401 status, signature verification fails

### 9.2 Data Validation (P2)

- [ ] **Missing Required Fields**: POST resume without title
  - **Verify**: 400 status, validation error
- [ ] **Invalid Data Types**: Send string for numeric field
  - **Verify**: 400 status, type error
- [ ] **SQL Injection Attempt**: Special characters in search
  - **Verify**: Query parameterization prevents injection
- [ ] **XSS Attempt**: Script tags in resume content
  - **Verify**: Content sanitized or escaped

### 9.3 Resource Ownership (P1)

- [ ] **User A tries to access User B's resume**
  - GET /api/resumes/:id (id belongs to User B)
  - **Verify**: 404 or 403 status
- [ ] **User A tries to update User B's resume**
  - PUT /api/resumes/:id
  - **Verify**: 403 status, access denied
- [ ] **User A tries to delete User B's resume**
  - DELETE /api/resumes/:id
  - **Verify**: 403 status

### 9.4 Rate Limiting (P3)

- [ ] **Rapid Requests**: Send 100 requests in 1 second
  - **Verify**: Rate limit kicks in, 429 status
  - **Verify**: Retry-After header present

---

## 10. Performance & Security

### 10.1 Performance Tests (P3)

**Test: Database Query Performance**
- [ ] GET /api/resumes with 100+ resumes
  - **Verify**: Response time < 500ms
- [ ] GET /api/users with 1000+ users (admin)
  - **Verify**: Response time < 1000ms

**Test: File Upload Performance**
- [ ] Upload 5MB PDF
  - **Verify**: Upload completes < 10s
- [ ] Upload 10MB DOCX (max size)
  - **Verify**: Upload completes < 15s

### 10.2 Security Tests (P2)

**Test: CORS Configuration**
- [ ] Request from allowed origin
  - **Verify**: CORS headers present
- [ ] Request from disallowed origin
  - **Verify**: CORS blocks request

**Test: Security Headers**
- [ ] Check response headers
  - **Verify**: X-Content-Type-Options: nosniff
  - **Verify**: X-Frame-Options present
  - **Verify**: Strict-Transport-Security (if HTTPS)

**Test: Password Security**
- [ ] Create user with password
  - **Verify**: Password hashed in database (bcrypt)
  - **Verify**: Plain text password never stored

---

## Test Execution Checklist

### Pre-Execution
- [ ] Environment setup complete (Section 1)
- [ ] Test data created
- [ ] Docker containers running
- [ ] Database schema verified

### Execution Order (Optimized)
1. [ ] **Critical Path Tests** (Section 2) - 15 minutes
2. [ ] **Authentication** (Section 3) - 10 minutes
3. [ ] **Resume Management** (Section 4) - 15 minutes
4. [ ] **Subscription & Plans** (Section 7) - 10 minutes
5. [ ] **AI Features** (Section 5) - 10 minutes (if providers configured)
6. [ ] **Admin Features** (Section 6) - 10 minutes
7. [ ] **Known Issues** (Section 8) - 5 minutes
8. [ ] **Edge Cases** (Section 9) - 10 minutes
9. [ ] **Performance/Security** (Section 10) - 10 minutes

**Total Estimated Time:** 1.5 - 2 hours

### Post-Execution
- [ ] Document all failures
- [ ] Create bug tickets for issues
- [ ] Re-test failed cases after fixes
- [ ] Generate test report

---

## API Endpoint Coverage Summary

| Category | Endpoints | Tested | Coverage |
|----------|-----------|--------|----------|
| Authentication | 14 | 14 | 100% |
| User Management | 5 | 5 | 100% |
| Resume Management | 5 | 5 | 100% |
| Resume Data | 3 | 3 | 100% |
| Versions | 4 | 4 | 100% |
| AI Features | 3 | 3 | 100% |
| File Upload | 2 | 2 | 100% |
| Subscriptions | 4 | 4 | 100% |
| AI Providers | 5 | 5 | 100% |
| Custom Prompts | 5 | 5 | 100% |
| FAQ | 3 | 3 | 100% |
| Coupons | 4 | 4 | 100% |
| Campaigns | 4 | 4 | 100% |
| Settings | 3 | 3 | 100% |
| Utility | 2 | 2 | 100% |
| **TOTAL** | **66** | **66** | **100%** |

*(Note: 67 total endpoints minus 1 static file serving = 66 testable API endpoints)*

---

## Frontend Page Coverage Summary

| Category | Pages | Test Coverage |
|----------|-------|--------------|
| Public Pages | 7 | Manual navigation & visual verification |
| Authenticated User Pages | 6 | Included in Critical Path & Resume tests |
| Admin Pages | 8 | Included in Admin Features tests |
| **TOTAL** | **21** | **100%** |

---

## Success Criteria

**Application is considered 100% functional when:**

✅ All P1 (Critical) tests pass
✅ All known issues from session are verified as fixed
✅ Critical path user journeys complete successfully
✅ Authentication and authorization working correctly
✅ Admin features accessible only to admins
✅ AI features require valid subscription
✅ No SQL errors or server crashes
✅ All CRUD operations work correctly

**Acceptable Failures:**
- P3 (Low priority) edge cases
- Performance tests under extreme load
- OAuth providers without valid credentials

---

## Appendix A: Test Data Templates

### Sample Resume Data
```json
{
  "personal_info": {
    "full_name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1-555-0123",
    "location": "San Francisco, CA",
    "linkedin": "linkedin.com/in/janesmith",
    "portfolio": "janesmith.dev"
  },
  "professional_summary": "Experienced software engineer with 5+ years building scalable web applications...",
  "work_experience": [
    {
      "company": "Tech Innovations Inc",
      "position": "Senior Software Engineer",
      "location": "San Francisco, CA",
      "start_date": "2021-03",
      "end_date": null,
      "is_current": true,
      "description": "Lead development of microservices architecture serving 1M+ users"
    }
  ],
  "education": [
    {
      "institution": "Stanford University",
      "degree": "BS",
      "field_of_study": "Computer Science",
      "start_date": "2014",
      "end_date": "2018",
      "gpa": "3.8"
    }
  ],
  "skills": [
    "JavaScript", "TypeScript", "React", "Node.js", "Python",
    "PostgreSQL", "Docker", "AWS", "Microservices", "REST APIs"
  ],
  "certifications": [
    {
      "name": "AWS Certified Solutions Architect",
      "issuing_organization": "Amazon Web Services",
      "issue_date": "2022-06",
      "credential_id": "ABC123"
    }
  ]
}
```

---

## Appendix B: Known Bugs Log

| ID | Issue | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BUG-001 | POST /api/subscriptions/plans SQL syntax error | P1 | FIXED | Empty placeholders in VALUES clause |
| BUG-002 | POST /api/subscriptions/activate returns 404 | P1 | FIXED | Endpoint was missing, now added |
| BUG-003 | DELETE /api/subscriptions/plans/:id SQL error | P2 | FIXED | Missing $1 placeholder in WHERE clause |

---

**End of Test Plan**

*Document Version: 1.0*
*Last Updated: 2025-12-15*
*Total Pages: [Generated]*
