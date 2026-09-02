import { describe, expect, test } from "bun:test";
import {
  DEFAULT_RETRY_TTL_MS,
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Queue } from "#src/enum/queue.enum";
import { apiRabbitQueues } from "./api-rabbit.js";

describe("API RabbitMQ topology", () => {
  test("declares every queue exactly once", () => {
    const names = apiRabbitQueues.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain(Queue.GUILDS_CREATE);
    expect(names).toContain(Queue.GUILDS_CREATE_RETRY);
    expect(names).toContain(Queue.GUILDS_CREATE_DLQ);
    expect(names).toContain(Queue.PRESENCE_COVERAGE_CHECK);
    expect(names).toContain("backend-notifications-delivery-result");
  });

  test("preserves delayed retry and dead-letter routing", () => {
    const main = apiRabbitQueues.find(
      ({ name }) => name === Queue.GUILDS_CREATE,
    );
    const retry = apiRabbitQueues.find(
      ({ name }) => name === Queue.GUILDS_CREATE_RETRY,
    );
    const deadLetter = apiRabbitQueues.find(
      ({ name }) => name === Queue.GUILDS_CREATE_DLQ,
    );

    expect(main).toMatchObject({
      exchange: RabbitExchange.DEFAULT,
      routingKey: RabbitRoutingKey.GUILDS_CREATE,
      deadLetterExchange: RabbitExchange.RETRY,
      deadLetterRoutingKey: RabbitRoutingKey.GUILDS_CREATE_RETRY,
    });
    expect(retry).toMatchObject({
      exchange: RabbitExchange.RETRY,
      routingKey: RabbitRoutingKey.GUILDS_CREATE_RETRY,
      messageTtl: DEFAULT_RETRY_TTL_MS,
      deadLetterExchange: RabbitExchange.DEFAULT,
      deadLetterRoutingKey: RabbitRoutingKey.GUILDS_CREATE,
    });
    expect(deadLetter).toMatchObject({
      exchange: RabbitExchange.DEAD_LETTER,
      routingKey: RabbitRoutingKey.GUILDS_CREATE_DLQ,
    });
  });
});
