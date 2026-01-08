import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = 'postgresql://postgres:btodTwZhNNOzgDjoJKUzhwhqvuOjtBOD@crossover.proxy.rlwy.net:15081/railway';

const client = new Client({ connectionString: DATABASE_URL });

client.connect()
  .then(async () => {
    console.log('Connected to database');

    // Read and execute the migration
    const migrationPath = path.join(__dirname, 'migrations', '007_update_provider_types.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('Running migration 007_update_provider_types.sql...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully');

    return client.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
    client.end();
    process.exit(1);
  });
