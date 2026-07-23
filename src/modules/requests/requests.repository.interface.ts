import { Request } from './entities/request.entity';
import { PaginatedResult } from '../../common/pagination/paginated';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';

export interface IRequestRepository {
  create(data: Partial<Request>): Request;
  save(request: Request): Promise<Request>;
  findById(tenantId: string, id: string): Promise<Request | null>;
  findPaginated(
    tenantId: string,
    query: ListRequestsQueryDto,
  ): Promise<PaginatedResult<Request>>;
  softRemove(request: Request): Promise<Request>;
}

export const REQUEST_REPOSITORY = Symbol('IRequestRepository');
