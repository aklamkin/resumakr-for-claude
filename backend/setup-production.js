#!/usr/bin/env node
/**
 * Production setup script
 * Configures the Railway database with required data
 *
 * Usage:
 *   DATABASE_URL=your_railway_db_url node setup-production.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:btodTwZhNNOzgDjoJKUzhwhqvuOjtBOD@crossover.proxy.rlwy.net:15081/railway';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

async function setupProduction() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Add OpenAI provider
    console.log('📝 Setting up AI provider...');
    await client.query(`
      INSERT INTO ai_providers (
        name, provider_type, api_key, api_endpoint, model_name, config, is_active, is_default
      ) VALUES (
        'OpenAI',
        'openai',
        $1,
        'https://api.openai.com/v1',
        'gpt-4o-mini',
        jsonb_build_object('api_key', $1),
        true,
        true
      )
      ON CONFLICT (name) DO UPDATE SET
        api_key = EXCLUDED.api_key,
        config = jsonb_build_object('api_key', $1),
        is_active = true,
        is_default = true
    `, [OPENAI_API_KEY]);
    console.log('✅ AI provider configured');

    // 2. Check subscription plans exist
    const plansResult = await client.query('SELECT COUNT(*) FROM subscription_plans');
    const planCount = parseInt(plansResult.rows[0].count);

    if (planCount === 0) {
      console.log('📝 Creating subscription plans...');
      await client.query(`
        INSERT INTO subscription_plans (plan_id, name, price, period, duration, features, is_popular, is_active)
        VALUES
          ('daily', 'Daily Plan', 0.99, 'day', 1, '["Unlimited resumes", "AI analysis", "ATS scoring"]'::jsonb, false, true),
          ('weekly', 'Weekly Plan', 6.49, 'week', 7, '["Unlimited resumes", "AI analysis", "ATS scoring", "Priority support"]'::jsonb, true, true),
          ('monthly', 'Monthly Plan', 29.99, 'month', 30, '["Unlimited resumes", "AI analysis", "ATS scoring", "Priority support", "Custom templates"]'::jsonb, false, true)
        ON CONFLICT (plan_id) DO NOTHING
      `);
      console.log('✅ Subscription plans created');
    } else {
      console.log(`✅ Subscription plans already exist (${planCount} plans)`);
    }

    console.log('\n🎉 Production setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupProduction();
