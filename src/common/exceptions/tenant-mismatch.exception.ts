import { ForbiddenException } from '@nestjs/common';

export class TenantMismatchException extends ForbiddenException {
  constructor() {
    super('Tenant mismatch: you cannot access this resource');
  }
}
