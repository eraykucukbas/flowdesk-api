import {
  RequestUrgency,
  RequestSentiment,
} from '../requests/entities/request.entity';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface ClassificationResult {
  category: string;
  urgency: RequestUrgency;
  sentiment: RequestSentiment;
  suggestedReply: string;
  tokenUsage: TokenUsage;
}

export interface IClassifier {
  classify(text: string): Promise<ClassificationResult>;
}

export const CLASSIFIER = Symbol('IClassifier');
