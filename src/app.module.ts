import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { envSchema, Env } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RequestsModule } from './modules/requests/requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          const formatted = result.error.issues
            .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
          throw new Error(`Environment validation failed:\n${formatted}`);
        }
        return result.data;
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => ({
        pinoHttp: {
          genReqId: (req: any) =>
            req.headers['x-correlation-id'] ?? randomUUID(),
          customProps: (req: any) => ({
            correlationId: req.id,
          }),
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          level: config.get('NODE_ENV') === 'test' ? 'silent' : 'info',
          autoLogging: {
            ignore: (req: any) => req.url === '/health',
          },
        },
      }),
    }),
    HealthModule,
    TenantsModule,
    UsersModule,
    RequestsModule,
  ],
})
export class AppModule {}
