import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IClassifier, ClassificationResult, TokenUsage } from '../classification.interface';
import type { Env } from '../../../config/env.validation';
import { CLASSIFY_V1_PROMPT } from '../prompts/classify-v1';
import { RequestUrgency, RequestSentiment } from '../../requests/entities/request.entity';

const VALID_URGENCIES = new Set(Object.values(RequestUrgency));
const VALID_SENTIMENTS = new Set(Object.values(RequestSentiment));

// Gemini 2.0 Flash pricing (per 1M tokens)
const INPUT_COST_PER_MILLION = 0.10;
const OUTPUT_COST_PER_MILLION = 0.40;

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

    const tokenUsage = this.extractTokenUsage(data);
    const result = this.parseResponse(rawText);

    return { ...result, tokenUsage };
  }

  private extractTokenUsage(data: Record<string, unknown>): TokenUsage {
    const usage = data.usageMetadata as
      | { promptTokenCount?: number; candidatesTokenCount?: number }
      | undefined;

    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;

    const estimatedCostUsd =
      (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
      (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

    return {
      inputTokens,
      outputTokens,
      estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
    };
  }

  private parseResponse(
    raw: string,
  ): Omit<ClassificationResult, 'tokenUsage'> {
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
