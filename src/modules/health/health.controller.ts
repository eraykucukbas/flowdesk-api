import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  @Get()
  check() {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      db: 'not_configured',
    };
  }
}
