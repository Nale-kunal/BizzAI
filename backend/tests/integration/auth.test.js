import request from 'supertest';
import app from '../../app.js';
import User from '../../models/User.js';
import { createTestUser } from '../setup/fixtures.js';

describe('Authentication API Integration Tests', () => {
    describe('POST /api/auth/register', () => {
        test('should register a new user successfully', async () => {
            const userData = {
                name: 'New User',
                email: 'newuser@example.com',
                password: 'Password123!',
                shopName: 'New Shop',
                phone: '9876543210'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.user).toHaveProperty('email', userData.email);
            expect(response.body.user).toHaveProperty('name', userData.name);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).not.toHaveProperty('password');

            // Verify user created in database
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeTruthy();
            expect(user.name).toBe(userData.name);
        });

        test('should fail with duplicate email', async () => {
            await createTestUser({ email: 'duplicate@example.com' });

            const userData = {
                name: 'Another User',
                email: 'duplicate@example.com',
                password: 'Password123!',
                shopName: 'Another Shop',
                phone: '9876543210'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        test('should fail with weak password', async () => {
            const userData = {
                name: 'New User',
                email: 'newuser@example.com',
                password: '123',
                shopName: 'New Shop'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should fail with missing required fields', async () => {
            const userData = {
                email: 'incomplete@example.com'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await createTestUser({
                email: 'login@example.com',
                password: 'Password123!'
            });
        });

        test('should login successfully with correct credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', 'login@example.com');
            expect(response.body.user).not.toHaveProperty('password');

            // Verify login history updated
            const user = await User.findById(testUser._id);
            expect(user.lastLoginAt).toBeTruthy();
            expect(user.loginHistory.length).toBeGreaterThan(0);
        });

        test('should fail with incorrect password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'WrongPassword123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid credentials');
        });

        test('should fail with non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('should lock account after 5 failed attempts', async () => {
            // Make 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'login@example.com',
                        password: 'WrongPassword'
                    });
            }

            // 6th attempt should be locked
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'Password123!'
                })
                .expect(423);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('locked');

            // Verify account locked in database
            const user = await User.findById(testUser._id);
            expect(user.accountLockedUntil).toBeTruthy();
            expect(user.failedLoginAttempts).toBe(5);
        });
    });

    describe('GET /api/auth/me', () => {
        let testUser, authToken;

        beforeEach(async () => {
            testUser = await createTestUser();

            // Login to get token
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'Password123!'
                });

            authToken = loginResponse.body.token;
        });

        test('should get current user with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user).toHaveProperty('email', testUser.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        test('should fail without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('should fail with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid_token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/logout', () => {
        let testUser, authToken;

        beforeEach(async () => {
            testUser = await createTestUser();

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'Password123!'
                });

            authToken = loginResponse.body.token;
        });

        test('should logout successfully', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Logged out');

            // Verify logout timestamp updated
            const user = await User.findById(testUser._id);
            expect(user.lastLogoutAt).toBeTruthy();
        });
    });
});
