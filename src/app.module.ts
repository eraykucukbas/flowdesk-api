import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    HealthModule,
    TenantsModule,
    UsersModule,
    RequestsModule,
  ],
})
export class AppModule {}
