export interface AmqpPublishOptions {
  headers?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AmqpPublisher {
  publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options?: AmqpPublishOptions,
  ): Effect.Effect<unknown, unknown>;
}
import type { Effect } from "effect";
