import { Injectable } from '@nestjs/common';
import { RequestsService } from '../requests/requests.service';
import { InboundWebhookDto } from './dto/inbound-webhook.dto';
import { Request } from '../requests/entities/request.entity';

@Injectable()
export class WebhooksService {
  constructor(private readonly requestsService: RequestsService) {}

  async handleInbound(
    tenantId: string,
    dto: InboundWebhookDto,
  ): Promise<Request> {
    return this.requestsService.create(tenantId, {
      title: `Inbound from ${dto.from}`,
      body: dto.text,
      channel: dto.channel,
      externalMessageId: dto.externalMessageId,
    });
  }
}
