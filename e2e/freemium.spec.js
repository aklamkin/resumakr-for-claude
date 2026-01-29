// @ts-check
const { test, expect } = require('@playwright/test');

// Helper to generate unique test email
const generateEmail = () => `test_${Date.now()}@test.com`;
const testPassword = 'TestPassword123!';

test.describe('Freemium Model', () => {
  test.describe('API Endpoints', () => {
    test('GET /api/auth/me returns tier info for authenticated user', async ({ request }) => {
      // First register a new user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      expect(registerResponse.ok()).toBeTruthy();
      const { token, user } = await registerResponse.json();

      // Verify registration response has tier info
      expect(user.tier).toBe('free');
      expect(user.aiCredits).toBeDefined();
      expect(user.aiCredits.total).toBe(5);
      expect(user.aiCredits.remaining).toBe(5);

      // Get user profile
      const meResponse = await request.get('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(meResponse.ok()).toBeTruthy();
      const profile = await meResponse.json();

      // Verify tier info in profile
      expect(profile.tier).toBe('free');
      expect(profile.tierLimits).toBeDefined();
      expect(profile.tierLimits.versionHistory).toBe(false);
      expect(profile.tierLimits.coverLetters).toBe(false);
      expect(profile.aiCredits.total).toBe(5);
    });

    test('GET /api/subscriptions/my-tier returns usage info', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Get tier info
      const tierResponse = await request.get('http://localhost:3001/api/subscriptions/my-tier', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(tierResponse.ok()).toBeTruthy();
      const tierData = await tierResponse.json();

      expect(tierData.tier).toBe('free');
      expect(tierData.limits).toBeDefined();
      expect(tierData.usage).toBeDefined();
      expect(tierData.usage.aiCredits).toBeDefined();
      expect(tierData.features.versionHistory).toBe(false);
      expect(tierData.upgradeUrl).toBe('/pricing');
    });

    test('Version history API returns 403 for free users', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Try to access version history
      const versionsResponse = await request.get('http://localhost:3001/api/versions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(versionsResponse.status()).toBe(403);
      const error = await versionsResponse.json();
      expect(error.feature).toBe('versionHistory');
      expect(error.upgradeUrl).toBe('/pricing');
    });

    test('Resume creation enforces rate limit for free users', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Create 3 resumes (the limit)
      for (let i = 0; i < 3; i++) {
        const createResponse = await request.post('http://localhost:3001/api/resumes', {
          headers: { 'Authorization': `Bearer ${token}` },
          data: { title: `Test Resume ${i + 1}`, status: 'draft', source_type: 'manual' }
        });
        expect(createResponse.ok()).toBeTruthy();
      }

      // 4th resume should fail with 429
      const limitResponse = await request.post('http://localhost:3001/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { title: 'Test Resume 4', status: 'draft', source_type: 'manual' }
      });
      expect(limitResponse.status()).toBe(429);
      const error = await limitResponse.json();
      expect(error.upgradeUrl).toBe('/pricing');
    });

    test('Cover letters blocked for free users', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Create a resume first
      const createResponse = await request.post('http://localhost:3001/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { title: 'Test Resume', status: 'draft', source_type: 'manual' }
      });
      const resume = await createResponse.json();

      // Try to create resume data with cover letter
      const dataResponse = await request.post('http://localhost:3001/api/resume-data', {
        headers: { 'Authorization': `Bearer ${token}` },
        data: {
          resume_id: resume.id,
          personal_info: { full_name: 'Test User' },
          cover_letter_short: 'This is a cover letter'
        }
      });
      expect(dataResponse.status()).toBe(403);
      const error = await dataResponse.json();
      expect(error.feature).toBe('coverLetters');
    });

    test('Templates API shows availability based on tier', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Get templates
      const templatesResponse = await request.get('http://localhost:3001/api/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(templatesResponse.ok()).toBeTruthy();
      const data = await templatesResponse.json();

      expect(data.tier).toBe('free');
      expect(data.templates).toBeDefined();
      expect(data.templates.length).toBeGreaterThan(0);

      // Free templates should be available
      const freeTemplates = data.templates.filter(t => !t.is_premium);
      expect(freeTemplates.length).toBe(5);
      freeTemplates.forEach(t => {
        expect(t.available).toBe(true);
      });

      // Premium templates should not be available
      const premiumTemplates = data.templates.filter(t => t.is_premium);
      premiumTemplates.forEach(t => {
        expect(t.available).toBe(false);
      });
    });

    test('Premium template selection blocked for free users', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Try to select a premium template
      const selectResponse = await request.post('http://localhost:3001/api/templates/denali/select', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(selectResponse.status()).toBe(403);
      const error = await selectResponse.json();
      expect(error.upgradeUrl).toBe('/pricing');
    });

    test('PDF export status shows limits for free users', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Check PDF status
      const statusResponse = await request.get('http://localhost:3001/api/exports/pdf-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(statusResponse.ok()).toBeTruthy();
      const status = await statusResponse.json();

      expect(status.tier).toBe('free');
      expect(status.canDownload).toBe(true);
      expect(status.limit).toBe(5);
      expect(status.used).toBe(0);
      expect(status.remaining).toBe(5);
      expect(status.watermark).toBe(true);
    });

    test('Upload extract blocked for free users (resumeParsing feature)', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token } = await registerResponse.json();

      // Try to extract from file
      const extractResponse = await request.post('http://localhost:3001/api/upload/extract', {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { file_url: '/uploads/test.pdf' }
      });
      expect(extractResponse.status()).toBe(403);
      const error = await extractResponse.json();
      expect(error.feature).toBe('resumeParsing');
    });

    test('Free users can create resumes (up to rate limit)', async ({ request }) => {
      // Register user
      const email = generateEmail();
      const registerResponse = await request.post('http://localhost:3001/api/auth/register', {
        data: { email, password: testPassword, full_name: 'Test User' }
      });
      const { token, user } = await registerResponse.json();

      // Verify user is free tier
      expect(user.tier).toBe('free');

      // Free users should be able to create a resume
      const createResponse = await request.post('http://localhost:3001/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { title: 'My First Resume', status: 'draft', source_type: 'manual' }
      });
      expect(createResponse.ok()).toBeTruthy();
      const resume = await createResponse.json();
      expect(resume.id).toBeDefined();
      expect(resume.title).toBe('My First Resume');
    });
  });
});
