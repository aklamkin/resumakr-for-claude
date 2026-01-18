/**
 * Authentication Routes Tests
 * Tests for /api/auth endpoints
 */

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from './testApp.js';
import { query } from '../src/config/database.js';

const app = createTestApp();

// Test user data - unique per test run
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  full_name: 'Test User'
};

let authToken = null;
let userId = null;

describe('Auth Routes', () => {

  afterAll(async () => {
    // Cleanup: delete test user and related data
    if (userId) {
      await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.full_name).toBe(testUser.full_name);
      expect(res.body.user).not.toHaveProperty('password_hash');

      authToken = res.body.token;
      userId = res.body.user.id;
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // API returns 409 Conflict for duplicate email
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'TestPassword123!',
          full_name: 'Test User'
        });

      expect(res.status).toBe(400);
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weakpass@example.com',
          password: '123',
          full_name: 'Test User'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);

      authToken = res.body.token;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(401);
    });

    it('should reject login without email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testUser.email);
      expect(res.body).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email for password reset', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // Should always return 200 to prevent email enumeration
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 200 even for non-existent email (security)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/verify-reset-token/:token', () => {
    it('should return valid=false for invalid/expired token', async () => {
      const res = await request(app)
        .get('/api/auth/verify-reset-token/invalid-token-that-does-not-exist');

      // API returns 200 with valid=false for invalid tokens
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('valid', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reject reset with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token-that-does-not-exist',
          password: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject reset with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          password: '123'
        });

      expect(res.status).toBe(400);
    });
  });
});

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(app)
      .get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
  });
});
