import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { ITenantRepository } from './tenants.repository.interface';

@Injectable()
export class TypeOrmTenantRepository implements ITenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
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
}
