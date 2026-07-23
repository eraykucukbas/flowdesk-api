import { Tenant } from './entities/tenant.entity';

export interface ITenantRepository {
  create(data: Partial<Tenant>): Tenant;
  save(tenant: Tenant): Promise<Tenant>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
}

export const TENANT_REPOSITORY = Symbol('ITenantRepository');
