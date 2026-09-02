import { describe, expect, it } from "bun:test";
import {
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { activityQueues } from "./activity-consumer.js";

describe("Activity RabbitMQ topology", () => {
  it("keeps deployed queue names and routing keys", () => {
    expect(
      activityQueues.map(({ name, routingKey }) => [name, routingKey]),
    ).toEqual([
      ["activity-log-create", RabbitRoutingKey.ACTIVITY_LOG_CREATE],
      ["activity-log-create.retry", RabbitRoutingKey.ACTIVITY_LOG_CREATE_RETRY],
      ["activity-log-create.dlq", RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ],
      ["guilds-members-remove", RabbitRoutingKey.GUILDS_MEMBERS_REMOVE],
      [
        "guilds-members-remove.retry",
        RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
      ],
      ["guilds-members-remove.dlq", RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ],
    ]);
  });

  it("uses broker dead-lettering through the retry exchange", () => {
    const main = activityQueues[0];
    const retry = activityQueues[1];
    expect(main.deadLetterExchange).toBe(RabbitExchange.RETRY);
    expect(retry.messageTtl).toBe(30_000);
    expect(retry.deadLetterExchange).toBe(RabbitExchange.DEFAULT);
  });
});
