import {
  RabbitExchange,
  type FailurePolicy,
  type RabbitExchangeName,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import type { ConsumeMessage } from "amqplib";
import { Schema } from "effect";

const isRetryCount = Schema.is(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
);

export const readRetryCount = (message: ConsumeMessage): number => {
  const value = message.properties.headers?.["x-lootlog-retry-count"];

  return isRetryCount(value) ? value : 0;
};

interface ForwardedFailure<Disposition extends "retry" | "dead-letter"> {
  readonly disposition: Disposition;
  readonly exchange: RabbitExchangeName;
  readonly routingKey: RabbitRoutingKeyName;
}

export type FailureRoute =
  | { readonly disposition: "reject" }
  | { readonly disposition: "requeue" }
  | ForwardedFailure<"retry">
  | ForwardedFailure<"dead-letter">;

export const failureRoute = (
  policy: FailurePolicy,
  unprocessable: boolean,
  currentRetryCount: number,
): FailureRoute => {
  switch (policy.strategy) {
    case "nack":
      return { disposition: "reject" };
    case "requeue":
      return unprocessable
        ? { disposition: "reject" }
        : { disposition: "requeue" };
    case "retry":
      if (!unprocessable && currentRetryCount < policy.maxRetries) {
        return {
          disposition: "retry",
          exchange: RabbitExchange.RETRY,
          routingKey: policy.retryRoutingKey,
        };
      }

      return {
        disposition: "dead-letter",
        exchange: RabbitExchange.DEAD_LETTER,
        routingKey: policy.deadLetterRoutingKey,
      };
    case "dead-letter":
      return {
        disposition: "dead-letter",
        exchange: RabbitExchange.DEAD_LETTER,
        routingKey: policy.deadLetterRoutingKey,
      };
  }
};
