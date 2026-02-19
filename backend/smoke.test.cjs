const request = require('supertest');

describe('backend smoke', () => {
    let app;

    beforeAll(async () => {
        const appModule = await import('./src/app.js');
        app = appModule.default;
    });

    test('GET /health returns success envelope', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            message: 'Server is running',
        });
        expect(typeof response.body.timestamp).toBe('string');
    });

    test('GET unknown route returns 404 in error envelope', async () => {
        const response = await request(app).get('/definitely-missing-route');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Not found');
    });

    test('POST /api/auth/register validates required fields', async () => {
        const response = await request(app).post('/api/auth/register').send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('POST /api/auth/login validates required fields', async () => {
        const response = await request(app).post('/api/auth/login').send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(Array.isArray(response.body.errors)).toBe(true);
    });

    test('POST /api/auth/forgot-password validates email format', async () => {
        const response = await request(app).post('/api/auth/forgot-password').send({ email: 'bad-email' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
    });

    test('POST /api/auth/reset-password validates required fields', async () => {
        const response = await request(app).post('/api/auth/reset-password').send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(Array.isArray(response.body.errors)).toBe(true);
    });

    test('GET /api/wishlist requires authentication', async () => {
        const response = await request(app).get('/api/wishlist');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Not authorized to access this route');
    });

    test('GET /api/wishlist rejects invalid bearer token', async () => {
        const response = await request(app)
            .get('/api/wishlist')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid token');
    });
});
