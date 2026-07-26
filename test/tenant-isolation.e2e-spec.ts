import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters';
import { DataSource } from 'typeorm';

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let tenantAToken: string;
  let tenantBToken: string;
  let tenantARequestId: string;

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
  });

  afterAll(async () => {
    await dataSource.query(
      'TRUNCATE TABLE request_events, requests, users, tenants CASCADE',
    );
    await app.close();
  });

  it('should register Tenant A and create a request', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        tenantName: 'Tenant A',
        email: 'admin@tenant-a.com',
        password: 'password123',
      })
      .expect(201);

    tenantAToken = registerRes.body.accessToken;

    const createRes = await request(app.getHttpServer())
      .post('/v1/requests')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({
        title: 'Secret request from Tenant A',
        body: 'This should not be visible to Tenant B',
        channel: 'EMAIL',
      })
      .expect(201);

    tenantARequestId = createRes.body.id;
    expect(tenantARequestId).toBeDefined();
  });

  it('should register Tenant B', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        tenantName: 'Tenant B',
        email: 'admin@tenant-b.com',
        password: 'password123',
      })
      .expect(201);

    tenantBToken = registerRes.body.accessToken;
  });

  it('should return 404 when Tenant B tries to access Tenant A request (not 403)', async () => {
    await request(app.getHttpServer())
      .get(`/v1/requests/${tenantARequestId}`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .expect(404);
  });

  it('should return empty list when Tenant B lists requests', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/requests')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.nextCursor).toBeNull();
  });

  it('should return 404 when Tenant B tries to update Tenant A request', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/requests/${tenantARequestId}`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({ title: 'Hacked!' })
      .expect(404);
  });

  it('should return 404 when Tenant B tries to delete Tenant A request', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/requests/${tenantARequestId}`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .expect(404);
  });

  it('should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get(`/v1/requests/${tenantARequestId}`)
      .expect(401);
  });

  it('Tenant A should still see its own request', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/requests/${tenantARequestId}`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(200);

    expect(res.body.id).toBe(tenantARequestId);
    expect(res.body.title).toBe('Secret request from Tenant A');
    expect(res.body.tenantId).toBeUndefined();
  });
});
