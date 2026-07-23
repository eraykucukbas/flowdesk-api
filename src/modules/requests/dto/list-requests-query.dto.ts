import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestStatus, RequestChannel } from '../entities/request.entity';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'status', 'urgency'];

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

  @Matches(
    new RegExp(`^(${SORTABLE_FIELDS.join('|')}):(asc|desc)$`),
    { message: `sort must be one of ${SORTABLE_FIELDS.join(', ')} with :asc or :desc` },
  )
  @IsOptional()
  sort?: string;

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

export function parseSort(sort?: string): { field: string; order: 'ASC' | 'DESC' } {
  if (!sort) return { field: 'createdAt', order: 'DESC' };
  const [field, order] = sort.split(':');
  return { field, order: order.toUpperCase() as 'ASC' | 'DESC' };
}
