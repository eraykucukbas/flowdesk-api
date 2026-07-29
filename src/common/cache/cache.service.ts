import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const DEFAULT_TTL_SECONDS = 300;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  requestKey(tenantId: string, requestId: string): string {
    return `request:${tenantId}:${requestId}`;
  }
}
