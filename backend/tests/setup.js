/**
 * Test Setup - Configure environment for testing
 *
 * Tests run against the local Docker database.
 * Make sure Docker is running: docker-compose up -d
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Override specific settings for testing
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4'; // Faster hashing for tests

// Silence console during tests unless DEBUG is set
if (!process.env.DEBUG) {
  console.log = () => {};
  console.info = () => {};
  // Keep console.error and console.warn for debugging test failures
}
