import { describe, expect, test } from "bun:test";
import {
  DEFAULT_RETRY_TTL_MS,
  makeRetryQueue,
  RabbitExchange,
  RabbitRoutingKey,
} from "../src/rabbit/topology.ts";

describe("canonical RabbitMQ topology", () => {
  test("keeps the deployed exchange names", () => {
    expect(RabbitExchange).toEqual({
      DEFAULT: "default",
      RETRY: "retry",
      DEAD_LETTER: "dlx",
    });
  });

  test("retry queues expire back to the original route", () => {
    expect(
      makeRetryQueue({
        name: "gateway-guilds-loots-create.retry",
        retryRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE_RETRY,
        destinationRoutingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
      }),
    ).toEqual({
      name: "gateway-guilds-loots-create.retry",
      exchange: RabbitExchange.RETRY,
      routingKey: "guilds.loots.create.retry",
      durable: true,
      messageTtl: DEFAULT_RETRY_TTL_MS,
      deadLetterExchange: RabbitExchange.DEFAULT,
      deadLetterRoutingKey: "guilds.loots.create",
    });
  });
});
