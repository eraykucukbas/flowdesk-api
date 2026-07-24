import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { IUserRepository } from './users.repository.interface';
import { USER_REPOSITORY } from './users.repository.interface';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repo: IUserRepository,
  ) {}

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);
    const user = this.repo.create({
      tenantId,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    return this.repo.save(user);
  }
}
