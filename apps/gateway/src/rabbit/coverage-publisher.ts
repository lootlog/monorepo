import type { RabbitMessagingService } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";

export interface CoverageUpdate {
  readonly guildId: string;
  readonly mapName: string;
  readonly discordId: string;
  readonly hasPlayer: boolean;
  readonly isAfk?: boolean;
}

export class CoveragePublisher {
  constructor(private readonly messaging: RabbitMessagingService) {}

  async publish(update: CoverageUpdate): Promise<void> {
    await Effect.runPromise(
      this.messaging.publish({
        routingKey: RabbitRoutingKey.PRESENCE_COVERAGE_CHECK,
        content: new TextEncoder().encode(JSON.stringify(update)),
      }),
    );
  }
}
