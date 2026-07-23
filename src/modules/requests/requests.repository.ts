import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from './entities/request.entity';
import { IRequestRepository } from './requests.repository.interface';

@Injectable()
export class TypeOrmRequestRepository implements IRequestRepository {
  constructor(
    @InjectRepository(Request)
    private readonly repo: Repository<Request>,
  ) {}

  create(data: Partial<Request>): Request {
    return this.repo.create(data);
  }

  async save(request: Request): Promise<Request> {
    return this.repo.save(request);
  }

  async findById(tenantId: string, id: string): Promise<Request | null> {
    return this.repo.findOne({
      where: { id, tenantId },
      relations: ['events'],
    });
  }

  async findAll(tenantId: string): Promise<Request[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async softRemove(request: Request): Promise<Request> {
    return this.repo.softRemove(request);
  }
}
