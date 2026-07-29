import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { IRequestRepository } from '../requests/requests.repository.interface';
import { REQUEST_REPOSITORY } from '../requests/requests.repository.interface';
import { CLASSIFICATION_QUEUE } from '../classification/classification.constants';
import type { ClassificationJobData } from '../classification/classification.processor';
import { InboundWebhookDto } from './dto/inbound-webhook.dto';
import { Request } from '../requests/entities/request.entity';

export interface InboundResult {
  request: Request;
  created: boolean;
}

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(REQUEST_REPOSITORY)
    private readonly requestRepo: IRequestRepository,
    @InjectQueue(CLASSIFICATION_QUEUE)
    private readonly classificationQueue: Queue<ClassificationJobData>,
  ) {}

  async handleInbound(
    tenantId: string,
    dto: InboundWebhookDto,
  ): Promise<InboundResult> {
    const existing = await this.requestRepo.findByExternalMessageId(
      tenantId,
      dto.externalMessageId,
    );

    if (existing) {
      return { request: existing, created: false };
    }

    const request = this.requestRepo.create({
      tenantId,
      title: `Inbound from ${dto.from}`,
      body: dto.text,
      channel: dto.channel,
      externalMessageId: dto.externalMessageId,
    });

    const saved = await this.requestRepo.save(request);

    await this.classificationQueue.add('classify', {
      requestId: saved.id,
      tenantId,
      text: dto.text,
    });

    return { request: saved, created: true };
  }
}
