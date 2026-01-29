// Global teardown: clean up test user accounts after all E2E tests complete.
// Prevents test_*@test.com accounts from accumulating in the database.

const { Pool } = require('../backend/node_modules/pg');
const path = require('path');
const fs = require('fs');

module.exports = async function globalTeardown() {
  // Read DATABASE_URL from backend/.env
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^DATABASE_URL=(.+)$/m);
    if (match) databaseUrl = match[1].trim();
  }

  if (!databaseUrl) {
    console.warn('[teardown] No DATABASE_URL found — skipping test user cleanup');
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Delete in dependency order
    const testUserIds = await pool.query(
      "SELECT id FROM users WHERE email LIKE 'test%@test.com' OR email LIKE 'test-%@example.com'"
    );

    if (testUserIds.rows.length === 0) {
      console.log('[teardown] No test users to clean up');
      return;
    }

    const ids = testUserIds.rows.map(r => r.id);

    await pool.query('DELETE FROM resume_data WHERE resume_id IN (SELECT id FROM resumes WHERE created_by = ANY($1))', [ids]);
    await pool.query('DELETE FROM resume_versions WHERE resume_id IN (SELECT id FROM resumes WHERE created_by = ANY($1))', [ids]);
    await pool.query('DELETE FROM resumes WHERE created_by = ANY($1)', [ids]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);

    console.log(`[teardown] Cleaned up ${ids.length} test user account(s)`);
  } catch (err) {
    console.error('[teardown] Cleanup failed:', err.message);
  } finally {
    await pool.end();
  }
};
