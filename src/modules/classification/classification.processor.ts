import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { ClassificationService } from './classification.service';
import { Request } from '../requests/entities/request.entity';
import {
  RequestEvent,
  RequestEventType,
} from '../requests/entities/request-event.entity';
import { CLASSIFICATION_QUEUE } from './classification.constants';

export interface ClassificationJobData {
  requestId: string;
  tenantId: string;
  text: string;
}

@Processor(CLASSIFICATION_QUEUE)
export class ClassificationProcessor extends WorkerHost {
  private readonly logger = new Logger(ClassificationProcessor.name);

  constructor(
    private readonly classificationService: ClassificationService,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<ClassificationJobData>): Promise<void> {
    const { requestId, tenantId, text } = job.data;

    this.logger.log(
      `Classifying request ${requestId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 3})`,
    );

    const classification = await this.classificationService.classify(text);

    if (classification.category === 'UNCLASSIFIED') {
      throw new Error('Classification returned UNCLASSIFIED — retrying');
    }

    const requestRepo = this.dataSource.getRepository(Request);
    const request = await requestRepo.findOne({
      where: { id: requestId, tenantId },
    });

    if (!request) {
      this.logger.warn(`Request ${requestId} not found, skipping`);
      return;
    }

    request.category = classification.category;
    request.urgency = classification.urgency;
    request.sentiment = classification.sentiment;
    await requestRepo.save(request);

    const eventRepo = this.dataSource.getRepository(RequestEvent);
    const event = eventRepo.create({
      requestId,
      type: RequestEventType.LLM_CLASSIFIED,
      payload: {
        category: classification.category,
        urgency: classification.urgency,
        sentiment: classification.sentiment,
        suggestedReply: classification.suggestedReply,
        tokenUsage: classification.tokenUsage,
      },
    });
    await eventRepo.save(event);

    this.logger.log(
      `Request ${requestId} classified as ${classification.category}`,
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ClassificationJobData>, error: Error): Promise<void> {
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3);

    if (isLastAttempt) {
      this.logger.error(
        `Classification permanently failed for request ${job.data.requestId} after ${job.attemptsMade} attempts: ${error.message}`,
      );

      const eventRepo = this.dataSource.getRepository(RequestEvent);
      const event = eventRepo.create({
        requestId: job.data.requestId,
        type: RequestEventType.CLASSIFICATION_FAILED,
        payload: {
          error: error.message,
          attempts: job.attemptsMade,
          lastAttemptAt: new Date().toISOString(),
        },
      });
      await eventRepo.save(event);
    } else {
      this.logger.warn(
        `Classification attempt ${job.attemptsMade}/${job.opts.attempts ?? 3} failed for request ${job.data.requestId}: ${error.message}`,
      );
    }
  }
}
