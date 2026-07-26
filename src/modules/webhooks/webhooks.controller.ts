import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators';
import { WebhooksService } from './webhooks.service';
import { InboundWebhookDto } from './dto/inbound-webhook.dto';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';

@ApiTags('Webhooks')
@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @UseGuards(WebhookSignatureGuard)
  @Post('inbound')
  @HttpCode(HttpStatus.CREATED)
  async handleInbound(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: InboundWebhookDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { request, created } = await this.webhooksService.handleInbound(
      tenantId,
      dto,
    );

    if (!created) {
      res.status(HttpStatus.OK);
    }

    return request;
  }
}
