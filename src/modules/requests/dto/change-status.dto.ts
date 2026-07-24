import { IsEnum } from 'class-validator';
import { RequestStatus } from '../entities/request.entity';

export class ChangeStatusDto {
  @IsEnum(RequestStatus)
  status!: RequestStatus;
}
