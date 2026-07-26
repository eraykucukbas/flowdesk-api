import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { TenantsModule } from '../tenants/tenants.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';

@Module({
  imports: [RequestsModule, TenantsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookSignatureGuard],
})
export class WebhooksModule {}
