const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./setup');

describe('Auth API & Security Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  it('should register a new user successfully and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('jane@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Should never leak password hash
    expect(res.body.data.token).toBeDefined();
  });

  it('should prevent registration with duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123'
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe 2',
        email: 'jane@example.com',
        password: 'password456'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should fail registration with invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'J',
        email: 'not-an-email',
        password: 'short'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should login an existing user with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securePassword123'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@example.com',
        password: 'securePassword123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securePassword123'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@example.com',
        password: 'wrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should access /api/auth/me with valid Bearer token', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Auth User',
        email: 'auth@example.com',
        password: 'password123'
      });

    const token = regRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('auth@example.com');
  });

  it('should reject protected route without authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
