import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { envSchema } from '../src/config/env.validation';
import { Tenant } from '../src/modules/tenants/entities/tenant.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Request, RequestChannel } from '../src/modules/requests/entities/request.entity';
import { RequestEvent } from '../src/modules/requests/entities/request-event.entity';
import { TypeOrmRequestRepository } from '../src/modules/requests/requests.repository';
import { TypeOrmTenantRepository } from '../src/modules/tenants/tenants.repository';

describe('Tenant Scope — Integration', () => {
  let dataSource: DataSource;
  let requestRepo: TypeOrmRequestRepository;
  let tenantRepo: TypeOrmTenantRepository;

  let tenantA: Tenant;
  let tenantB: Tenant;
  let requestA: Request;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (config) => {
            const result = envSchema.safeParse(config);
            if (!result.success) throw new Error('Env validation failed');
            return result.data;
          },
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          entities: [Tenant, User, Request, RequestEvent],
          synchronize: false,
        }),
        TypeOrmModule.forFeature([Tenant, User, Request, RequestEvent]),
      ],
      providers: [TypeOrmRequestRepository, TypeOrmTenantRepository],
    }).compile();

    dataSource = module.get(DataSource);
    requestRepo = module.get(TypeOrmRequestRepository);
    tenantRepo = module.get(TypeOrmTenantRepository);

    // Seed two tenants directly via repository
    tenantA = tenantRepo.create({ name: 'Integration Tenant A' });
    tenantA = await tenantRepo.save(tenantA);

    tenantB = tenantRepo.create({ name: 'Integration Tenant B' });
    tenantB = await tenantRepo.save(tenantB);

    // Create a request for Tenant A
    requestA = requestRepo.create({
      tenantId: tenantA.id,
      title: 'Tenant A request',
      body: 'Belongs to Tenant A only',
      channel: RequestChannel.EMAIL,
      externalMessageId: 'int-test-msg-001',
    });
    requestA = await requestRepo.save(requestA);
  });

  afterAll(async () => {
    await dataSource.query(
      'DELETE FROM request_events WHERE request_id IN (SELECT id FROM requests WHERE tenant_id IN ($1, $2))',
      [tenantA.id, tenantB.id],
    );
    await dataSource.query(
      'DELETE FROM requests WHERE tenant_id IN ($1, $2)',
      [tenantA.id, tenantB.id],
    );
    await dataSource.query(
      'DELETE FROM users WHERE tenant_id IN ($1, $2)',
      [tenantA.id, tenantB.id],
    );
    await dataSource.query(
      'DELETE FROM tenants WHERE id IN ($1, $2)',
      [tenantA.id, tenantB.id],
    );
    await dataSource.destroy();
  });

  describe('findById', () => {
    it('should return request when tenantId matches', async () => {
      const found = await requestRepo.findById(tenantA.id, requestA.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(requestA.id);
    });

    it('should return null when tenantId does not match', async () => {
      const found = await requestRepo.findById(tenantB.id, requestA.id);
      expect(found).toBeNull();
    });
  });

  describe('findPaginated', () => {
    it('should return only requests belonging to the tenant', async () => {
      const resultA = await requestRepo.findPaginated(tenantA.id, {});
      expect(resultA.data.length).toBeGreaterThanOrEqual(1);
      expect(resultA.data.every((r) => r.tenantId === tenantA.id)).toBe(true);
    });

    it('should return empty for tenant with no requests', async () => {
      const resultB = await requestRepo.findPaginated(tenantB.id, {});
      expect(resultB.data).toHaveLength(0);
      expect(resultB.nextCursor).toBeNull();
    });
  });

  describe('findByExternalMessageId', () => {
    it('should find by externalMessageId within same tenant', async () => {
      const found = await requestRepo.findByExternalMessageId(
        tenantA.id,
        'int-test-msg-001',
      );
      expect(found).not.toBeNull();
      expect(found!.id).toBe(requestA.id);
    });

    it('should not find across tenants even with correct externalMessageId', async () => {
      const found = await requestRepo.findByExternalMessageId(
        tenantB.id,
        'int-test-msg-001',
      );
      expect(found).toBeNull();
    });
  });

  describe('softRemove', () => {
    it('should soft-delete only within tenant scope', async () => {
      // Create a request for Tenant A to soft-delete
      let toDelete = requestRepo.create({
        tenantId: tenantA.id,
        title: 'Will be deleted',
        body: 'Soft delete test',
        channel: RequestChannel.PHONE,
      });
      toDelete = await requestRepo.save(toDelete);

      await requestRepo.softRemove(toDelete);

      // Should not be found in normal query
      const found = await requestRepo.findById(tenantA.id, toDelete.id);
      expect(found).toBeNull();

      // Original request should still exist
      const original = await requestRepo.findById(tenantA.id, requestA.id);
      expect(original).not.toBeNull();
    });
  });
});
