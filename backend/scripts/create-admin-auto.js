import bcrypt from 'bcrypt';
import { query } from '../src/config/database.js';

(async () => {
  try {
    const email = 'alex@klamkin.com';
    const password = 'uwa9prh2uzy2ndm*CAG';
    const fullName = 'Admin User';

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (email, password, full_name, role, created_at)
       VALUES ($1, $2, $3, 'admin', NOW())
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $2`,
      [email, hashedPassword, fullName]
    );

    console.log('✓ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Role: admin');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
