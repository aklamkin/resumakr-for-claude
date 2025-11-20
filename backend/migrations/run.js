import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    const files = await fs.readdir(__dirname);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      console.log(`Applying: ${file}`);
      const sql = await fs.readFile(path.join(__dirname, file), 'utf8');
      await pool.query(sql);
      console.log(`✓ ${file} applied`);
    }

    console.log('All migrations completed!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
