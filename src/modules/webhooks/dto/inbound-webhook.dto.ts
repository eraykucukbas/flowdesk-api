import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { RequestChannel } from '../../requests/entities/request.entity';

export class InboundWebhookDto {
  @IsString()
  @IsNotEmpty()
  externalMessageId!: string;

  @IsEnum(RequestChannel)
  channel!: RequestChannel;

  @IsString()
  @IsNotEmpty()
  from!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsDateString()
  receivedAt!: string;
}
