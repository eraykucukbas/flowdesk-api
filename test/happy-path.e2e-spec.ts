import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters';
import { DataSource } from 'typeorm';

describe('Happy Path (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let accessToken: string;
  let refreshToken: string;
  let webhookSecret: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query(
      'TRUNCATE TABLE request_events, requests, users, tenants CASCADE',
    );
    await app.close();
  });

  // --- Auth flow ---

  it('should register a new tenant', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        tenantName: 'Happy Path Corp',
        email: 'admin@happy-path.com',
        password: 'securePass123',
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.webhookSecret).toBeDefined();

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
    webhookSecret = res.body.webhookSecret;

    // Extract tenantId from JWT
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString(),
    );
    tenantId = payload.tenantId;
  });

  it('should login with registered credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'admin@happy-path.com',
        password: 'securePass123',
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should refresh tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  // --- Request CRUD ---

  let requestId: string;

  it('should create a request', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Billing issue',
        body: 'I was charged twice for my subscription',
        channel: 'EMAIL',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Billing issue');
    expect(res.body.status).toBe('OPEN');
    expect(res.body.tenantId).toBeUndefined();
    requestId = res.body.id;
  });

  it('should list requests with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].tenantId).toBeUndefined();
  });

  it('should get a single request by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/requests/${requestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(requestId);
    expect(res.body.title).toBe('Billing issue');
  });

  it('should update a request', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/requests/${requestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Billing issue — updated' })
      .expect(200);

    expect(res.body.title).toBe('Billing issue — updated');
  });

  it('should change request status via state machine', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/v1/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'RESOLVED' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/v1/requests/${requestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.status).toBe('RESOLVED');
  });

  it('should reject invalid state transition', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(400);
  });

  it('should soft-delete a request (ADMIN only)', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/requests/${requestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/requests/${requestId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  // --- User management ---

  it('should create an AGENT user', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'agent@happy-path.com',
        password: 'agentPass123',
      })
      .expect(201);

    expect(res.body.role).toBe('AGENT');
    expect(res.body.email).toBe('agent@happy-path.com');
  });

  it('AGENT should not be able to delete requests', async () => {
    // Login as agent
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'agent@happy-path.com',
        password: 'agentPass123',
      })
      .expect(201);

    const agentToken = loginRes.body.accessToken;

    // Create a request as agent
    const createRes = await request(app.getHttpServer())
      .post('/v1/requests')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Agent request',
        body: 'Created by agent',
        channel: 'PHONE',
      })
      .expect(201);

    // Agent should not delete
    await request(app.getHttpServer())
      .delete(`/v1/requests/${createRes.body.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(403);
  });

  // --- Webhook idempotency ---

  it('should create request via webhook with valid signature', async () => {
    const body = JSON.stringify({
      externalMessageId: 'webhook-e2e-001',
      channel: 'CHAT',
      from: 'customer@external.com',
      text: 'My order is late',
      receivedAt: '2026-07-26T10:00:00Z',
    });

    const signature = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const res = await request(app.getHttpServer())
      .post('/v1/webhooks/inbound')
      .set('Content-Type', 'application/json')
      .set('x-tenant-id', tenantId)
      .set('x-signature', signature)
      .send(body)
      .expect(201);

    expect(res.body.externalMessageId).toBe('webhook-e2e-001');
    expect(res.body.channel).toBe('CHAT');
  });

  it('should return 200 for duplicate webhook (idempotency)', async () => {
    const body = JSON.stringify({
      externalMessageId: 'webhook-e2e-001',
      channel: 'CHAT',
      from: 'customer@external.com',
      text: 'My order is late',
      receivedAt: '2026-07-26T10:00:00Z',
    });

    const signature = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const res = await request(app.getHttpServer())
      .post('/v1/webhooks/inbound')
      .set('Content-Type', 'application/json')
      .set('x-tenant-id', tenantId)
      .set('x-signature', signature)
      .send(body)
      .expect(200);

    expect(res.body.externalMessageId).toBe('webhook-e2e-001');
  });

  it('should reject webhook with invalid signature', async () => {
    const body = JSON.stringify({
      externalMessageId: 'webhook-e2e-002',
      channel: 'EMAIL',
      from: 'attacker@bad.com',
      text: 'Fake webhook',
      receivedAt: '2026-07-26T10:00:00Z',
    });

    await request(app.getHttpServer())
      .post('/v1/webhooks/inbound')
      .set('Content-Type', 'application/json')
      .set('x-tenant-id', tenantId)
      .set('x-signature', 'invalid-signature')
      .send(body)
      .expect(401);
  });

  // --- Logout ---

  it('should logout and invalidate refresh token', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
