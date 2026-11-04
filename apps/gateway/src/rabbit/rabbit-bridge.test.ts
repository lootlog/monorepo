import { describe, expect, test } from "bun:test";
import { RabbitExchange } from "@lootlog/protocol/rabbit/topology";
import { gatewayQueueDefinitions } from "./rabbit-bridge.js";

describe("Gateway RabbitMQ topology", () => {
  test("keeps every queue name unique", () => {
    const names = gatewayQueueDefinitions.map((queue) => queue.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("gateway-guilds-loots-create");
    expect(names).toContain("gateway-presence-check-request");
  });

  test("installs retry and dead-letter queues for retryable deliveries", () => {
    const lootRetry = gatewayQueueDefinitions.find(
      (queue) => queue.name === "gateway-guilds-loots-create.retry",
    );

    const lootDlq = gatewayQueueDefinitions.find(
      (queue) => queue.name === "gateway-guilds-loots-create.dlq",
    );

    expect(lootRetry?.exchange).toBe(RabbitExchange.RETRY);
    expect(lootRetry?.messageTtl).toBe(30_000);
    expect(lootDlq?.exchange).toBe(RabbitExchange.DEAD_LETTER);
    expect(
      gatewayQueueDefinitions.some(
        (queue) =>
          queue.name === "gateway-guilds-notifications-volunteer.retry",
      ),
    ).toBe(false);
    expect(
      gatewayQueueDefinitions.some(
        (queue) => queue.name === "gateway-guilds-notifications-volunteer.dlq",
      ),
    ).toBe(true);
  });
});
