import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) return next.handle();

    return next.handle().pipe(
      map((data) => this.stripTenantId(data)),
    );
  }

  private stripTenantId(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.stripTenantId(item));
    }

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;

      if ('data' in obj && Array.isArray(obj.data)) {
        return {
          ...obj,
          data: obj.data.map((item: unknown) => this.stripTenantId(item)),
        };
      }

      const { tenantId, ...rest } = obj;
      return rest;
    }

    return data;
  }
}
