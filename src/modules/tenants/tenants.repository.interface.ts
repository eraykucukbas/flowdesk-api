import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';

export interface CreateTenantWithOwnerData {
  tenantName: string;
  email: string;
  passwordHash: string;
}

export interface ITenantRepository {
  create(data: Partial<Tenant>): Tenant;
  save(tenant: Tenant): Promise<Tenant>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
  createTenantWithOwner(
    data: CreateTenantWithOwnerData,
  ): Promise<{ tenant: Tenant; user: User }>;
}

export const TENANT_REPOSITORY = Symbol('ITenantRepository');
