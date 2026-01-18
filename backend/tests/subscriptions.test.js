/**
 * Subscription Routes Tests
 * Tests for /api/subscriptions endpoints
 *
 * Note: The current API only has /plans endpoint which returns all plans.
 * There is no /plans/all or /status endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from './testApp.js';
import { query } from '../src/config/database.js';

const app = createTestApp();

let adminToken = null;
let adminId = null;
let userToken = null;
let userId = null;

describe('Subscription Routes', () => {

  beforeAll(async () => {
    // Create a regular user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `sub-user-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        full_name: 'Subscription Test User'
      });
    userToken = userRes.body.token;
    userId = userRes.body.user.id;

    // Create an admin user
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `sub-admin-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        full_name: 'Subscription Admin'
      });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user.id;

    // Make admin user an admin
    await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', adminId]);
  });

  afterAll(async () => {
    // Cleanup test plans created during tests
    await query("DELETE FROM subscription_plans WHERE plan_id LIKE 'test-plan-%'");
    await query("DELETE FROM subscription_plans WHERE plan_id = 'invalid-price-plan'");
    // Cleanup users
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (adminId) await query('DELETE FROM users WHERE id = $1', [adminId]);
  });

  describe('GET /api/subscriptions/plans', () => {
    it('should list subscription plans (public)', async () => {
      const res = await request(app)
        .get('/api/subscriptions/plans');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should include required plan fields', async () => {
      const res = await request(app)
        .get('/api/subscriptions/plans');

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        const plan = res.body[0];
        expect(plan).toHaveProperty('plan_id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('duration');
        expect(plan).toHaveProperty('period');
      }
    });
  });

  describe('POST /api/subscriptions/plans (Admin)', () => {
    it('should require authentication to create plan', async () => {
      const res = await request(app)
        .post('/api/subscriptions/plans')
        .send({
          plan_id: 'test-plan-noauth',
          name: 'Test Plan',
          price: 9.99,
          duration: 1,
          period: 'month'
        });

      expect(res.status).toBe(401);
    });

    it('should require admin to create plan', async () => {
      const res = await request(app)
        .post('/api/subscriptions/plans')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          plan_id: 'test-plan-nonadmin',
          name: 'Test Plan',
          price: 9.99,
          duration: 1,
          period: 'month'
        });

      expect(res.status).toBe(403);
    });

    it('should allow admin to create plan', async () => {
      const uniquePlanId = `test-plan-${Date.now()}`;
      const res = await request(app)
        .post('/api/subscriptions/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan_id: uniquePlanId,
          name: 'Test Plan',
          price: 9.99,
          duration: 1,
          period: 'month',
          features: ['Feature 1', 'Feature 2']
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.plan_id).toBe(uniquePlanId);
      expect(res.body.name).toBe('Test Plan');
    });

    it('should reject duplicate plan_id', async () => {
      const res = await request(app)
        .post('/api/subscriptions/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan_id: 'daily', // Existing plan
          name: 'Duplicate Plan',
          price: 9.99,
          duration: 1,
          period: 'month'
        });

      // API returns 409 for duplicate
      expect(res.status).toBe(409);
    });
  });
});
