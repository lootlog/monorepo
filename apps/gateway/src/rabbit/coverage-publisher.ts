import {
  type RabbitMessagingService,
  RabbitMessaging,
} from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer } from "effect";

export interface CoverageUpdate {
  readonly guildId: string;
  readonly mapName: string;
  readonly discordId: string;
  readonly hasPlayer: boolean;
  readonly isAfk?: boolean;
}

export class CoveragePublisher {
  constructor(private readonly messaging: RabbitMessagingService) {}

  publish(update: CoverageUpdate): Effect.Effect<void, unknown> {
    return this.messaging.publish({
      routingKey: RabbitRoutingKey.PRESENCE_COVERAGE_CHECK,
      content: new TextEncoder().encode(JSON.stringify(update)),
    });
  }
}

/** Asks the API to re-check map coverage when presence changes it. */
export class Coverage extends Context.Service<Coverage, CoveragePublisher>()(
  "@lootlog/gateway/rabbit/Coverage",
) {
  static readonly layer = Layer.effect(
    Coverage,
    Effect.map(
      RabbitMessaging,
      (messaging) => new CoveragePublisher(messaging),
    ),
  );
}
