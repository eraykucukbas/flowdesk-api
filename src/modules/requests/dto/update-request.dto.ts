import { IsOptional, IsString } from 'class-validator';

export class UpdateRequestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;
}
