import { rabbitmqConfig } from "./rabbitmq.config";
import { Queue } from "src/gateway/enums/queue.enum";
import { RoutingKey } from "src/gateway/enums/routing-key.enum";

describe("rabbitmqConfig", () => {
  it("routes failed reservation v2 changes through a retry queue", () => {
    expect(rabbitmqConfig.queues).toContainEqual({
      name: Queue.GUILDS_RESERVATIONS_CHANGED_V2_RETRY,
      exchange: "retry",
      routingKey: RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_RETRY,
      options: {
        durable: true,
        messageTtl: 30_000,
        deadLetterExchange: "default",
        deadLetterRoutingKey: RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
      },
    });
  });
});
