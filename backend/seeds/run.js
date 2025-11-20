import { query } from '../src/config/database.js';

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    await query(`
      INSERT INTO subscription_plans (plan_id, name, price, period, duration, features, is_popular)
      VALUES 
        ('daily', 'Daily Pass', 2.99, 'day', 1, '["Unlimited resumes", "AI features", "All templates"]', false),
        ('weekly', 'Weekly Pass', 9.99, 'week', 7, '["Unlimited resumes", "AI features", "All templates", "Cover letters"]', false),
        ('monthly', 'Monthly Plan', 29.99, 'month', 30, '["Unlimited resumes", "AI features", "All templates", "Cover letters", "ATS analysis"]', true),
        ('annual', 'Annual Plan', 199.99, 'year', 365, '["Everything", "Priority support"]', false)
      ON CONFLICT (plan_id) DO NOTHING
    `);

    console.log('✓ Subscription plans seeded');

    await query(`
      INSERT INTO faq_items (question, answer, category, order_index, is_published)
      VALUES
        ('How do I create a resume?', 'Click "Build from Scratch" to start a new resume or "Upload Resume" to enhance an existing one.', 'Getting Started', 1, true),
        ('What AI features are available?', 'Our AI can improve your professional summary, enhance job responsibilities, suggest skills, analyze ATS compatibility, and generate cover letters.', 'Features', 2, true),
        ('How does ATS analysis work?', 'Our system compares your resume against job descriptions, identifies keywords, and provides recommendations to improve your match score.', 'Features', 3, true)
      ON CONFLICT DO NOTHING
    `);

    console.log('✓ FAQ items seeded');
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
