import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  RequestStatus,
  RequestUrgency,
  RequestSentiment,
} from '../entities/request.entity';

export class UpdateRequestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(RequestUrgency)
  @IsOptional()
  urgency?: RequestUrgency;

  @IsEnum(RequestSentiment)
  @IsOptional()
  sentiment?: RequestSentiment;
}
