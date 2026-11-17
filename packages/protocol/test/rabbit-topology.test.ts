import { describe, expect, test } from "bun:test";
import {
  consumerRoute,
  RabbitExchange,
  RabbitRoutingKey,
  type ConsumerFailure,
  type ConsumerRoute,
} from "../src/rabbit/topology.ts";

/** Every exchange and routing key a failed delivery of `route` can be sent to. */
const failureDestinations = (route: ConsumerRoute) => {
  const policy = route.failurePolicy;

  const published: string[][] = [];

  if (policy.strategy === "retry")
    published.push([RabbitExchange.RETRY, policy.retryRoutingKey]);

  if (policy.strategy === "retry" || policy.strategy === "dead-letter")
    published.push([RabbitExchange.DEAD_LETTER, policy.deadLetterRoutingKey]);

  const brokerDeadLettered = route.queues.flatMap((queue) =>
    queue.deadLetterExchange && queue.deadLetterRoutingKey
      ? [[queue.deadLetterExchange, queue.deadLetterRoutingKey]]
      : [],
  );

  return [...published, ...brokerDeadLettered];
};

describe("canonical RabbitMQ topology", () => {
  test("keeps the deployed exchange names", () => {
    expect(RabbitExchange).toEqual({
      DEFAULT: "default",
      RETRY: "retry",
      DEAD_LETTER: "dlx",
    });
  });

  // The broker silently drops a message published to an unbound routing key.
  test.each<ConsumerFailure>([
    "retry",
    "broker-retry",
    "dead-letter",
    "requeue",
    "nack",
  ])("binds a queue to every %s failure destination", (failure) => {
    const route = consumerRoute(
      "gateway-guilds-loots-create",
      RabbitRoutingKey.GUILDS_LOOTS_CREATE,
      { failure },
    );

    const bound = new Set(
      route.queues.map((queue) => `${queue.exchange} ${queue.routingKey}`),
    );

    for (const [exchange, routingKey] of failureDestinations(route)) {
      expect(bound).toContain(`${exchange} ${routingKey}`);
    }
  });
});
