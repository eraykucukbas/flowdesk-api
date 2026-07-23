import { Inject, Injectable } from '@nestjs/common';
import type { IRequestRepository } from './requests.repository.interface';
import { REQUEST_REPOSITORY } from './requests.repository.interface';
import { Request } from './entities/request.entity';
import { RequestNotFoundException } from '../../common/exceptions/request-not-found.exception';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';
import { PaginatedResult } from '../../common/pagination/paginated';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(REQUEST_REPOSITORY)
    private readonly repo: IRequestRepository,
  ) {}

  async create(tenantId: string, data: Partial<Request>): Promise<Request> {
    const request = this.repo.create({ ...data, tenantId });
    return this.repo.save(request);
  }

  async findAll(
    tenantId: string,
    query: ListRequestsQueryDto,
  ): Promise<PaginatedResult<Request>> {
    return this.repo.findPaginated(tenantId, query);
  }

  async findOne(tenantId: string, id: string): Promise<Request> {
    const request = await this.repo.findById(tenantId, id);
    if (!request) {
      throw new RequestNotFoundException(id);
    }
    return request;
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<Request>,
  ): Promise<Request> {
    const request = await this.findOne(tenantId, id);
    Object.assign(request, data);
    return this.repo.save(request);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const request = await this.findOne(tenantId, id);
    await this.repo.softRemove(request);
  }
}
