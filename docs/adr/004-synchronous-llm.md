# ADR-004: Synchronous LLM Classification with Fallback

## Context

Incoming webhook messages are classified by an LLM (Gemini 2.0 Flash) to extract category, urgency, sentiment, and a suggested reply. The classification can be done synchronously (blocking the webhook response) or asynchronously (via a job queue).

## Decision

Classify synchronously within the webhook request lifecycle. If the LLM call fails or times out (5-second `AbortSignal.timeout`), save the request with `UNCLASSIFIED` category and default values. Never drop the inbound request due to an LLM failure.

## Consequences

- **Positive:** Simpler architecture — no queue infrastructure (Redis + BullMQ), no worker processes, no retry state management. The webhook caller gets the classification result immediately. Fallback ensures zero message loss.
- **Negative:** Webhook response time includes LLM latency (~200-500ms typical, up to 5s timeout). Under high volume, synchronous calls could exhaust Node.js event loop connections. Not suitable for >100 requests/second.

## When to Move to a Queue (v0.2)

- Webhook volume exceeds what synchronous processing can handle
- Classification needs retry with exponential backoff
- Multiple LLM providers with failover routing
- Response time SLA requires the webhook to return 202 immediately

The v0.2 plan adds BullMQ with Redis: webhook returns 202, a worker picks up the job, classifies, and updates the request. Dead-letter queue captures permanent failures.
