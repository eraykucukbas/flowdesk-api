import { RequestUrgency, RequestSentiment } from '../requests/entities/request.entity';

export interface ClassificationResult {
  category: string;
  urgency: RequestUrgency;
  sentiment: RequestSentiment;
  suggestedReply: string;
}

export interface IClassifier {
  classify(text: string): Promise<ClassificationResult>;
}

export const CLASSIFIER = Symbol('IClassifier');
