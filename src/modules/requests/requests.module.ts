import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request } from './entities/request.entity';
import { RequestEvent } from './entities/request-event.entity';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { TypeOrmRequestRepository } from './requests.repository';
import { REQUEST_REPOSITORY } from './requests.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Request, RequestEvent])],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    { provide: REQUEST_REPOSITORY, useClass: TypeOrmRequestRepository },
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
