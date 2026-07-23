import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from './entities/request.entity';
import { IRequestRepository } from './requests.repository.interface';
import {
  ListRequestsQueryDto,
  parseSort,
} from './dto/list-requests-query.dto';
import {
  PaginatedResult,
  decodeCursor,
  encodeCursor,
} from '../../common/pagination/paginated';

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

  async findPaginated(
    tenantId: string,
    query: ListRequestsQueryDto,
  ): Promise<PaginatedResult<Request>> {
    const limit = query.limit ?? 20;

    const { field: sortField, order: sortOrder } = parseSort(query.sort);

    const qb = this.repo
      .createQueryBuilder('request')
      .where('request.tenantId = :tenantId', { tenantId })
      .orderBy(`request.${sortField}`, sortOrder)
      .addOrderBy('request.id', sortOrder)
      .take(limit + 1);

    // Apply cursor (always based on createdAt + id for consistency)
    if (query.cursor) {
      const { createdAt, id } = decodeCursor(query.cursor);
      const op = sortOrder === 'DESC' ? '<' : '>';
      qb.andWhere(
        `(request.createdAt ${op} :cursorDate OR (request.createdAt = :cursorDate AND request.id ${op} :cursorId))`,
        { cursorDate: createdAt, cursorId: id },
      );
    }

    // Apply filters
    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
    }
    if (query.channel) {
      qb.andWhere('request.channel = :channel', { channel: query.channel });
    }
    if (query.category) {
      qb.andWhere('request.category = :category', {
        category: query.category,
      });
    }

    const results = await qb.getMany();

    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;
    const lastItem = data[data.length - 1];

    return {
      data,
      nextCursor:
        hasNextPage && lastItem
          ? encodeCursor(lastItem.createdAt, lastItem.id)
          : null,
    };
  }

  async softRemove(request: Request): Promise<Request> {
    return this.repo.softRemove(request);
  }
}
