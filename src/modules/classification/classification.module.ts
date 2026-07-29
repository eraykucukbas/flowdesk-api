import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ClassificationService } from './classification.service';
import { ClassificationProcessor } from './classification.processor';
import { GeminiProvider } from './providers/gemini.provider';
import { CLASSIFIER } from './classification.interface';
import { CLASSIFICATION_QUEUE } from './classification.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: CLASSIFICATION_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  providers: [
    ClassificationService,
    ClassificationProcessor,
    { provide: CLASSIFIER, useClass: GeminiProvider },
  ],
  exports: [ClassificationService, BullModule],
})
export class ClassificationModule {}
