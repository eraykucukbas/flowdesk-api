import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import type { IUserRepository } from '../users/users.repository.interface';
import { USER_REPOSITORY } from '../users/users.repository.interface';
import type { ITenantRepository } from '../tenants/tenants.repository.interface';
import { TENANT_REPOSITORY } from '../tenants/tenants.repository.interface';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Env } from '../../config/env.validation';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);
    const { tenant, user } = await this.tenantRepo.createTenantWithOwner({
      tenantName: dto.tenantName,
      email: dto.email,
      passwordHash,
    });

    const tokens = await this.generateTokens(user.id, tenant.id, user.role);
    await this.updateRefreshTokenHash(user, tokens.refreshToken);

    return tokens;
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
    await this.updateRefreshTokenHash(user, tokens.refreshToken);

    return tokens;
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hashMatch = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!hashMatch) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
    await this.updateRefreshTokenHash(user, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (user) {
      user.refreshTokenHash = null;
      await this.userRepo.save(user);
    }
  }

  private async generateTokens(userId: string, tenantId: string, role: string) {
    const payload: JwtPayload = { sub: userId, tenantId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(
    user: User,
    refreshToken: string,
  ): Promise<void> {
    user.refreshTokenHash = await argon2.hash(refreshToken);
    await this.userRepo.save(user);
  }
}
