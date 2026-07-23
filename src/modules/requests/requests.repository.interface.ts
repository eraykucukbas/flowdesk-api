import { Request } from './entities/request.entity';

export interface IRequestRepository {
  create(data: Partial<Request>): Request;
  save(request: Request): Promise<Request>;
  findById(tenantId: string, id: string): Promise<Request | null>;
  findAll(tenantId: string): Promise<Request[]>;
  softRemove(request: Request): Promise<Request>;
}

export const REQUEST_REPOSITORY = Symbol('IRequestRepository');
