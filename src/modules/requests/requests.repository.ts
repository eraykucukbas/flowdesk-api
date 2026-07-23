import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from './entities/request.entity';
import { IRequestRepository } from './requests.repository.interface';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';
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

    const qb = this.repo
      .createQueryBuilder('request')
      .where('request.tenantId = :tenantId', { tenantId })
      .orderBy('request.createdAt', 'DESC')
      .addOrderBy('request.id', 'DESC')
      .take(limit + 1); // fetch one extra to determine if there's a next page

    // Apply cursor
    if (query.cursor) {
      const { createdAt, id } = decodeCursor(query.cursor);
      qb.andWhere(
        '(request.createdAt < :cursorDate OR (request.createdAt = :cursorDate AND request.id < :cursorId))',
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
