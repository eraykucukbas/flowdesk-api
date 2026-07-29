# ADR-004: LLM Classification via Job Queue (Updated in v0.2)

## Context

Incoming webhook messages are classified by an LLM (Gemini 2.0 Flash) to extract category, urgency, sentiment, and a suggested reply.

**v0.1 decision:** Classify synchronously within the webhook request lifecycle. Simple, but blocks the response.

**v0.2 update:** Moved classification to a BullMQ job queue. The webhook returns 202 Accepted immediately; a background worker picks up the classification job.

## Decision (v0.2)

Use BullMQ with Redis as the job queue. The webhook endpoint saves the request and enqueues a classification job. A `ClassificationProcessor` worker processes the job asynchronously — classifies the text, updates the request, and creates an `LLM_CLASSIFIED` event.

**Retry strategy:** 3 attempts with exponential backoff (2s base delay, so 2s → 4s → 8s). If all attempts fail, the job moves to the dead-letter state. `ClassificationService` still has a 5-second timeout per attempt and returns `UNCLASSIFIED` fallback if the LLM fails — the request is never lost.

## Consequences

- **Positive:** Webhook response time drops to ~10ms (no LLM latency). Retry with backoff handles transient LLM failures. Failed jobs are preserved for inspection. Horizontal scaling: add more workers.
- **Negative:** Classification result is not available in the webhook response (eventually consistent). Requires Redis infrastructure.

## Alternatives Considered

- **Synchronous (v0.1 approach):** Simpler but webhook response includes LLM latency. No retry mechanism.
- **EventEmitter:** In-process async, but no persistence — a crash loses the job. No retry, no DLQ.
