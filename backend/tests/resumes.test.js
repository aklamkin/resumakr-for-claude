/**
 * Resume Routes Tests
 * Tests for /api/resumes endpoints
 *
 * Note: Resume routes require authentication AND active subscription.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from './testApp.js';
import { query } from '../src/config/database.js';

const app = createTestApp();

// Test user for resume operations
const testUser = {
  email: `resume-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  full_name: 'Resume Test User'
};

let authToken = null;
let userId = null;
let resumeId = null;

describe('Resume Routes', () => {

  beforeAll(async () => {
    // Create a test user and get auth token
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    authToken = res.body.token;
    userId = res.body.user.id;

    // Make user subscribed for testing protected routes
    await query(
      'UPDATE users SET is_subscribed = true, subscription_end_date = NOW() + interval \'30 days\' WHERE id = $1',
      [userId]
    );
  });

  afterAll(async () => {
    // Cleanup all resumes for test user
    if (userId) {
      await query('DELETE FROM resume_data WHERE resume_id IN (SELECT id FROM resumes WHERE created_by = $1)', [userId]);
      await query('DELETE FROM resumes WHERE created_by = $1', [userId]);
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('POST /api/resumes', () => {
    it('should create a new resume', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Resume',
          source_type: 'manual'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test Resume');
      expect(res.body.source_type).toBe('manual');
      expect(res.body.status).toBe('draft');

      resumeId = res.body.id;
    });

    it('should reject resume creation without auth', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .send({
          title: 'Unauthorized Resume',
          source_type: 'manual'
        });

      expect(res.status).toBe(401);
    });

    it('should reject resume with missing title', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          source_type: 'manual'
        });

      expect(res.status).toBe(400);
    });

    it('should reject resume with invalid source_type', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Invalid Source',
          source_type: 'invalid'
        });

      expect(res.status).toBe(400);
    });

    it('should reject resume creation without subscription', async () => {
      // Create an unsubscribed user
      const unsubUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `unsub-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          full_name: 'Unsubscribed User'
        });

      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${unsubUser.body.token}`)
        .send({
          title: 'No Sub Resume',
          source_type: 'manual'
        });

      expect(res.status).toBe(403);

      // Cleanup
      await query('DELETE FROM users WHERE id = $1', [unsubUser.body.user.id]);
    });
  });

  describe('GET /api/resumes', () => {
    it('should list user resumes', async () => {
      const res = await request(app)
        .get('/api/resumes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('title');
    });

    it('should reject listing without auth', async () => {
      const res = await request(app)
        .get('/api/resumes');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/resumes/:id', () => {
    it('should get a specific resume', async () => {
      const res = await request(app)
        .get(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(resumeId);
      expect(res.body.title).toBe('Test Resume');
    });

    it('should return 404 for non-existent resume', async () => {
      const res = await request(app)
        .get('/api/resumes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject access to other user\'s resume (403 - needs subscription)', async () => {
      // Create another user (without subscription)
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          full_name: 'Other User'
        });

      const res = await request(app)
        .get(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`);

      // Unsubscribed user gets 403 before reaching the resume
      expect(res.status).toBe(403);

      // Cleanup other user
      await query('DELETE FROM users WHERE id = $1', [otherUser.body.user.id]);
    });
  });

  describe('PUT /api/resumes/:id', () => {
    it('should update resume title', async () => {
      const res = await request(app)
        .put(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Resume Title'
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Resume Title');
    });

    it('should update resume status to active', async () => {
      const res = await request(app)
        .put(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'active'  // Valid values: draft, active, archived
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
    });

    it('should reject invalid status value', async () => {
      const res = await request(app)
        .put(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid-status'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    let deleteResumeId = null;

    beforeAll(async () => {
      // Create a resume to delete
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Resume to Delete',
          source_type: 'manual'
        });
      deleteResumeId = res.body.id;
    });

    it('should delete a resume', async () => {
      const res = await request(app)
        .delete(`/api/resumes/${deleteResumeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Verify it's deleted
      const getRes = await request(app)
        .get(`/api/resumes/${deleteResumeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent resume delete', async () => {
      const res = await request(app)
        .delete('/api/resumes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
