import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type { ITenantRepository } from '../../tenants/tenants.repository.interface';
import { TENANT_REPOSITORY } from '../../tenants/tenants.repository.interface';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const signature = req.headers['x-signature'] as string | undefined;

    if (!tenantId || !signature) {
      throw new UnauthorizedException('Missing x-tenant-id or x-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException('Raw body not available');
    }

    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant');
    }

    const expected = createHmac('sha256', tenant.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
