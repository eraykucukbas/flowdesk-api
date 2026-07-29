import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { IRequestRepository } from './requests.repository.interface';
import { REQUEST_REPOSITORY } from './requests.repository.interface';
import { Request, RequestStatus } from './entities/request.entity';
import { RequestNotFoundException } from '../../common/exceptions/request-not-found.exception';
import { UpdateRequestDto } from './dto/update-request.dto';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';
import { PaginatedResult } from '../../common/pagination/paginated';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(REQUEST_REPOSITORY)
    private readonly repo: IRequestRepository,
    private readonly cache: CacheService,
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
    const cacheKey = this.cache.requestKey(tenantId, id);

    const cached = await this.cache.get<Request>(cacheKey);
    if (cached) return cached;

    const request = await this.repo.findById(tenantId, id);
    if (!request) {
      throw new RequestNotFoundException(id);
    }

    await this.cache.set(cacheKey, request);
    return request;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateRequestDto,
  ): Promise<Request> {
    const request = await this.findOne(tenantId, id);
    if (dto.title !== undefined) request.title = dto.title;
    if (dto.body !== undefined) request.body = dto.body;
    const saved = await this.repo.save(request);
    await this.cache.del(this.cache.requestKey(tenantId, id));
    return saved;
  }

  async changeStatus(
    tenantId: string,
    id: string,
    targetStatus: RequestStatus,
  ): Promise<Request> {
    const request = await this.findOne(tenantId, id);

    try {
      switch (targetStatus) {
        case RequestStatus.IN_PROGRESS:
          request.markInProgress();
          break;
        case RequestStatus.RESOLVED:
          request.markResolved();
          break;
        case RequestStatus.CLOSED:
          request.close();
          break;
        case RequestStatus.OPEN:
          request.reopen();
          break;
      }
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid status transition',
      );
    }

    const saved = await this.repo.save(request);
    await this.cache.del(this.cache.requestKey(tenantId, id));
    return saved;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const request = await this.findOne(tenantId, id);
    await this.repo.softRemove(request);
    await this.cache.del(this.cache.requestKey(tenantId, id));
  }
}
