import { Test, TestingModule } from '@nestjs/testing';
import { ClassificationService } from './classification.service';
import { CLASSIFIER } from './classification.interface';
import type {
  IClassifier,
  ClassificationResult,
} from './classification.interface';
import {
  RequestUrgency,
  RequestSentiment,
} from '../requests/entities/request.entity';

const successResult: ClassificationResult = {
  category: 'BILLING',
  urgency: RequestUrgency.HIGH,
  sentiment: RequestSentiment.NEGATIVE,
  suggestedReply: 'We will look into your billing issue.',
  tokenUsage: {
    inputTokens: 150,
    outputTokens: 40,
    estimatedCostUsd: 0.000031,
  },
};

describe('ClassificationService', () => {
  let service: ClassificationService;
  let mockClassifier: jest.Mocked<IClassifier>;

  beforeEach(async () => {
    mockClassifier = {
      classify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassificationService,
        { provide: CLASSIFIER, useValue: mockClassifier },
      ],
    }).compile();

    service = module.get(ClassificationService);
  });

  it('should return classification result on success', async () => {
    mockClassifier.classify.mockResolvedValue(successResult);

    const result = await service.classify('I was charged twice');

    expect(result).toEqual(successResult);
    expect(mockClassifier.classify).toHaveBeenCalledWith('I was charged twice');
  });

  it('should return UNCLASSIFIED fallback on timeout', async () => {
    mockClassifier.classify.mockRejectedValue(
      new DOMException('The operation was aborted', 'AbortError'),
    );

    const result = await service.classify('Some text');

    expect(result.category).toBe('UNCLASSIFIED');
    expect(result.urgency).toBe(RequestUrgency.MEDIUM);
    expect(result.sentiment).toBe(RequestSentiment.NEUTRAL);
    expect(result.suggestedReply).toBe('');
    expect(result.tokenUsage.inputTokens).toBe(0);
    expect(result.tokenUsage.outputTokens).toBe(0);
  });

  it('should return UNCLASSIFIED fallback on API error', async () => {
    mockClassifier.classify.mockRejectedValue(
      new Error('Gemini API returned 500'),
    );

    const result = await service.classify('Some text');

    expect(result.category).toBe('UNCLASSIFIED');
    expect(result.tokenUsage.estimatedCostUsd).toBe(0);
  });

  it('should return UNCLASSIFIED fallback on invalid response', async () => {
    mockClassifier.classify.mockRejectedValue(
      new Error('Invalid classification response: {"bad":"data"}'),
    );

    const result = await service.classify('Some text');

    expect(result.category).toBe('UNCLASSIFIED');
    expect(result.sentiment).toBe(RequestSentiment.NEUTRAL);
  });

  it('should not throw even when classifier throws', async () => {
    mockClassifier.classify.mockRejectedValue(new Error('Network failure'));

    await expect(service.classify('anything')).resolves.toBeDefined();
  });
});
