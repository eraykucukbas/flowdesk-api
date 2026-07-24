import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import {
  CreateTenantWithOwnerData,
  ITenantRepository,
} from './tenants.repository.interface';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class TypeOrmTenantRepository implements ITenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
    private readonly dataSource: DataSource,
  ) {}

  create(data: Partial<Tenant>): Tenant {
    return this.repo.create(data);
  }

  async save(tenant: Tenant): Promise<Tenant> {
    return this.repo.save(tenant);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  async createTenantWithOwner(
    data: CreateTenantWithOwnerData,
  ): Promise<{ tenant: Tenant; user: User }> {
    return this.dataSource.transaction(async (manager) => {
      const tenant = manager.create(Tenant, { name: data.tenantName });
      const savedTenant = await manager.save(tenant);

      const user = manager.create(User, {
        tenantId: savedTenant.id,
        email: data.email,
        passwordHash: data.passwordHash,
        role: UserRole.ADMIN,
      });
      const savedUser = await manager.save(user);

      return { tenant: savedTenant, user: savedUser };
    });
  }
}
