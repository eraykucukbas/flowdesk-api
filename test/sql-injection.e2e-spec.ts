import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters';
import { DataSource } from 'typeorm';

describe('SQL Injection (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    // Register a tenant to get an access token
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        tenantName: 'SQLi Test Tenant',
        email: 'sqli-test@example.com',
        password: 'password123',
      })
      .expect(201);

    accessToken = res.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.query(
      'TRUNCATE TABLE request_events, requests, users, tenants CASCADE',
    );
    await app.close();
  });

  describe('Body fields — ORM parameterization', () => {
    it('should safely store SQL payload in title without executing it', async () => {
      const payload = "'; DROP TABLE requests; --";

      const res = await request(app.getHttpServer())
        .post('/v1/requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: payload,
          body: 'Normal body',
          channel: 'EMAIL',
        })
        .expect(201);

      // Payload stored as literal string, not executed as SQL
      expect(res.body.title).toBe(payload);

      // Verify table still exists by querying it
      const tableCheck = await dataSource.query(
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'requests'`,
      );
      expect(Number(tableCheck[0].count)).toBe(1);
    });

    it('should safely store UNION SELECT payload in body', async () => {
      const payload = "' UNION SELECT password_hash FROM users WHERE email='admin@test.com' --";

      const res = await request(app.getHttpServer())
        .post('/v1/requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Normal title',
          body: payload,
          channel: 'PHONE',
        })
        .expect(201);

      expect(res.body.body).toBe(payload);
    });
  });

  describe('Login email — ORM parameterization', () => {
    it('should not bypass auth with classic OR injection', async () => {
      // ValidationPipe rejects this before it reaches the DB — 400, not 401
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: "' OR 1=1 --",
          password: 'anything',
        });

      expect([400, 401]).toContain(res.status);
    });

    it('should not bypass auth with always-true condition', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: "admin@test.com' OR '1'='1",
          password: 'anything',
        });

      expect([400, 401]).toContain(res.status);
      // Either way: injection does NOT succeed — no 200, no token
      expect(res.body.accessToken).toBeUndefined();
    });
  });

  describe('Query parameters — filter injection', () => {
    it('should reject invalid status enum (blocks injection at validation layer)', async () => {
      await request(app.getHttpServer())
        .get("/v1/requests?status=' OR 1=1 --")
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should safely handle injection payload in category filter', async () => {
      const res = await request(app.getHttpServer())
        .get("/v1/requests?category=' OR '1'='1")
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Returns empty — no rows match the literal string, injection didn't execute
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('Sort parameter — whitelist validation', () => {
    it('should reject sort with SQL payload (validation layer blocks it)', async () => {
      await request(app.getHttpServer())
        .get('/v1/requests?sort=createdAt; DROP TABLE requests --:desc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should reject arbitrary column name in sort', async () => {
      await request(app.getHttpServer())
        .get('/v1/requests?sort=passwordHash:asc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
