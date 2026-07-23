import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus, RequestChannel } from '../entities/request.entity';

export class ListRequestsQueryDto {
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsEnum(RequestChannel)
  @IsOptional()
  channel?: RequestChannel;

  @IsString()
  @IsOptional()
  category?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  cursor?: string;
}
