import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { WebhooksService } from './webhooks.service';
import { InboundWebhookDto } from './dto/inbound-webhook.dto';

@ApiTags('Webhooks')
@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('inbound')
  handleInbound(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: InboundWebhookDto,
  ) {
    return this.webhooksService.handleInbound(tenantId, dto);
  }
}
