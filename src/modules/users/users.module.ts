import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { TypeOrmUserRepository } from './users.repository';
import { USER_REPOSITORY } from './users.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
