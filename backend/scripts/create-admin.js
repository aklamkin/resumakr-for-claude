import readline from 'readline';
import bcrypt from 'bcrypt';
import { query } from '../src/config/database.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function createAdmin() {
  try {
    console.log('\n=== Create Admin User ===\n');
    const email = await ask('Email: ');
    const password = await ask('Password: ');
    const fullName = await ask('Full Name (optional): ');

    if (!email || !password) {
      console.error('Email and password required');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (email, password, full_name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $2`,
      [email, hashedPassword, fullName || '']
    );

    console.log('\n✓ Admin user created!');
    console.log(`Email: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

createAdmin();
