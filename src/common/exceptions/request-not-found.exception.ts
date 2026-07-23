import { NotFoundException } from '@nestjs/common';

export class RequestNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Request ${id} not found`);
  }
}
