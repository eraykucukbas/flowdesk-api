import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IClassifier, ClassificationResult } from '../classification.interface';
import type { Env } from '../../../config/env.validation';
import { CLASSIFY_V1_PROMPT } from '../prompts/classify-v1';
import { RequestUrgency, RequestSentiment } from '../../requests/entities/request.entity';

const VALID_URGENCIES = new Set(Object.values(RequestUrgency));
const VALID_SENTIMENTS = new Set(Object.values(RequestSentiment));

@Injectable()
export class GeminiProvider implements IClassifier {
  private readonly apiKey: string;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(config: ConfigService<Env>) {
    this.apiKey = config.get('LLM_API_KEY')!;
  }

  async classify(text: string): Promise<ClassificationResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: CLASSIFY_V1_PROMPT + text }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Gemini API error: ${response.status} ${body}`);
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }

    return this.parseResponse(rawText);
  }

  private parseResponse(raw: string): ClassificationResult {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed.category !== 'string' ||
      typeof parsed.suggestedReply !== 'string' ||
      !VALID_URGENCIES.has(parsed.urgency) ||
      !VALID_SENTIMENTS.has(parsed.sentiment)
    ) {
      throw new Error(`Invalid classification response: ${raw}`);
    }

    return {
      category: parsed.category,
      urgency: parsed.urgency as RequestUrgency,
      sentiment: parsed.sentiment as RequestSentiment,
      suggestedReply: parsed.suggestedReply,
    };
  }
}
