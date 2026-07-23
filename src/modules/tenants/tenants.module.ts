import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TypeOrmTenantRepository } from './tenants.repository';
import { TENANT_REPOSITORY } from './tenants.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [
    { provide: TENANT_REPOSITORY, useClass: TypeOrmTenantRepository },
  ],
  exports: [TENANT_REPOSITORY],
})
export class TenantsModule {}
