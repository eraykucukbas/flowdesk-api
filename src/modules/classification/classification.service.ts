import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  IClassifier,
  ClassificationResult,
} from './classification.interface';
import { CLASSIFIER } from './classification.interface';
import {
  RequestUrgency,
  RequestSentiment,
} from '../requests/entities/request.entity';

const FALLBACK_RESULT: ClassificationResult = {
  category: 'UNCLASSIFIED',
  urgency: RequestUrgency.MEDIUM,
  sentiment: RequestSentiment.NEUTRAL,
  suggestedReply: '',
  tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
};

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  constructor(
    @Inject(CLASSIFIER)
    private readonly classifier: IClassifier,
  ) {}

  async classify(text: string): Promise<ClassificationResult> {
    try {
      return await this.classifier.classify(text);
    } catch (err) {
      this.logger.error(
        `Classification failed, using fallback: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      return FALLBACK_RESULT;
    }
  }
}
