import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RequestChannel } from '../entities/request.entity';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsEnum(RequestChannel)
  channel!: RequestChannel;

  @IsString()
  @IsOptional()
  externalMessageId?: string;
}
