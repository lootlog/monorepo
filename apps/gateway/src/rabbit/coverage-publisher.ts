import {
  type RabbitMessagingService,
  RabbitMessaging,
  eventMessage,
} from "@lootlog/messaging";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer } from "effect";

export class CoveragePublisher {
  constructor(private readonly messaging: RabbitMessagingService) {}

  publish(
    update: CanonicalRabbitEvent<
      typeof RabbitRoutingKey.PRESENCE_COVERAGE_CHECK
    >,
  ): Effect.Effect<void, unknown> {
    return this.messaging.publish(
      eventMessage(RabbitRoutingKey.PRESENCE_COVERAGE_CHECK, update),
    );
  }
}

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
