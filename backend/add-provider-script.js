import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres:btodTwZhNNOzgDjoJKUzhwhqvuOjtBOD@crossover.proxy.rlwy.net:15081/railway';
const OPENAI_API_KEY = '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';

const client = new Client({ connectionString: DATABASE_URL });

client.connect()
  .then(() => {
    console.log('Connected to database');
    // First, set all providers to non-default
    return client.query(`UPDATE ai_providers SET is_default = false`)
      .then(() => {
        // Then insert or update the OpenAI provider
        return client.query(`
          INSERT INTO ai_providers (name, provider_type, api_key, api_endpoint, model_name, config, is_active, is_default)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        `, ['OpenAI', 'openai', OPENAI_API_KEY, 'https://api.openai.com/v1', 'gpt-4o-mini', JSON.stringify({api_key: OPENAI_API_KEY}), true, true]);
      });
  })
  .then((result) => {
    console.log('✅ AI provider added successfully');
    return client.end();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    client.end();
    process.exit(1);
  });
