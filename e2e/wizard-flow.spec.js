// @ts-check
const { test, expect } = require('@playwright/test');

// Helper to generate unique test email
const generateEmail = () => `test_wizard_${Date.now()}@test.com`;
const testPassword = 'TestPassword123!';

test.describe('Resume Wizard Flow', () => {
  test('Complete wizard from start to finish', async ({ page }) => {
    const email = generateEmail();
    const testName = 'John TestUser';
    const testEmail = 'john.test@example.com';

    // 1. Register a new user
    await page.goto('http://localhost:5173/signup');
    await page.waitForSelector('#fullName', { timeout: 5000 });
    await page.fill('#fullName', testName);
    await page.fill('#email', email);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect after registration
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
    await page.goto('http://localhost:5173/myresumes');
    await page.waitForSelector('text=My Resumes', { timeout: 10000 });
    console.log('1. User registered and at My Resumes');

    // 2. Click "Create Resume" to start wizard
    await page.click('text=Create Resume');
    await page.waitForURL(/buildwizard/i, { timeout: 5000 });
    console.log('2. Wizard opened');

    // === STEP 1: Personal Info ===
    await page.waitForSelector('input[placeholder="John Doe"]', { timeout: 10000 });
    await page.fill('input[placeholder="John Doe"]', testName);
    await page.fill('input[placeholder="john@example.com"]', testEmail);
    await page.fill('input[placeholder="+1 (555) 123-4567"]', '+1 (555) 123-4567');
    await page.fill('input[placeholder="San Francisco, CA"]', 'New York, NY');
    console.log('3. Step 1 (Personal Info) filled');

    await page.click('text=Next Step');
    await page.waitForSelector('text=Step 2 of 5', { timeout: 10000 });
    console.log('4. Moved to Step 2');

    // === STEP 2: Work Experience ===
    await page.click('text=Add Position');
    await page.waitForSelector('input[placeholder="Acme Corporation"]', { timeout: 5000 });
    await page.fill('input[placeholder="Acme Corporation"]', 'Acme Corp');
    await page.fill('input[placeholder="Senior Software Engineer"]', 'Software Engineer');
    console.log('5. Step 2 (Work Experience) filled');

    await page.click('text=Next Step');
    await page.waitForSelector('text=Step 3 of 5', { timeout: 10000 });
    console.log('6. Moved to Step 3');

    // === STEP 3: Education ===
    await page.click('text=Add Education');
    await page.waitForSelector('input[placeholder="University of California"]', { timeout: 5000 });
    await page.fill('input[placeholder="University of California"]', 'MIT');
    await page.fill('input[placeholder="Bachelor of Science"]', 'BS');
    await page.fill('input[placeholder="Computer Science"]', 'Computer Science');
    console.log('7. Step 3 (Education) filled');

    await page.click('text=Next Step');
    await page.waitForSelector('text=Step 4 of 5', { timeout: 10000 });
    console.log('8. Moved to Step 4');

    // === STEP 4: Skills ===
    // Skills step uses a textarea for bulk add or input for individual skills
    await page.waitForSelector('textarea[placeholder*="React, Node.js"]', { timeout: 5000 });
    await page.fill('textarea[placeholder*="React, Node.js"]', 'JavaScript, React, Node.js');
    console.log('9. Step 4 (Skills) filled');

    await page.click('text=Next Step');
    await page.waitForSelector('text=Step 5 of 5', { timeout: 10000 });
    console.log('10. Moved to Step 5');

    // === STEP 5: Certifications & More ===
    // Just click Complete & Review (certifications are optional)
    await page.click('text=Complete & Review');

    // Should navigate to ResumeReview page
    await page.waitForURL(/resumereview/i, { timeout: 15000 });
    console.log('11. Wizard completed - now at Resume Review');

    // Verify we're on the review page with our data
    await page.waitForSelector(`text=${testName}`, { timeout: 10000 });
    console.log('12. Resume Review shows correct name');

    console.log('SUCCESS: Wizard completed from start to finish!');
  });
});
