import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import {
  consumeEvent,
  RabbitMessaging,
  type MessagingError,
  type RabbitMessagingService,
  type RabbitConsumer,
  type RabbitDelivery,
} from "@lootlog/messaging";
import { Effect, Layer, type Scope } from "effect";
import { Commands, type CommandHandler } from "#src/realtime/command-handler";
import { Hub, type RealtimeHub } from "#src/realtime/realtime-hub";
import { Presence, type PresenceStore } from "#src/realtime/presence-store";
import {
  gatewayBridgeRoutes,
  runBridgeRoute,
  type BridgeRoutes,
} from "#src/rabbit/bridge-routes";
import {
  Coverage,
  type CoveragePublisher,
} from "#src/rabbit/coverage-publisher";
import {
  deadLetterIdentifiers,
  gatewayDeadLetterQueues,
  gatewayRoutes,
  type ConsumedRoutingKey,
} from "#src/rabbit/gateway-queues";

export class RabbitBridge {
  static readonly layer = Layer.effectDiscard(
    Effect.gen(function* () {
      const bridge = new RabbitBridge(
        yield* RabbitMessaging,
        yield* Hub,
        yield* Commands,
        yield* Presence,
        yield* Coverage,
      );

      yield* Effect.acquireRelease(bridge.start(), () =>
        bridge.stop().pipe(Effect.orDie),
      );
    }),
  );

  private consumers: RabbitConsumer[] = [];

  private readonly routes: BridgeRoutes;

  constructor(
    private readonly messaging: RabbitMessagingService,
    hub: RealtimeHub,
    commands: Pick<CommandHandler, "rebalanceAcrossInstances">,
    presence: Pick<PresenceStore, "coverageForMap">,
    coverage: Pick<CoveragePublisher, "publish">,
  ) {
    this.routes = gatewayBridgeRoutes({ hub, commands, presence, coverage });
  }

  start(): Effect.Effect<void, MessagingError, Scope.Scope> {
    const { messaging, consumers } = this;
    const handle = this.handle.bind(this);

    return Effect.gen(function* () {
      for (const route of gatewayRoutes) {
        const consumer = yield* consumeEvent(
          messaging,
          route,
          (payload, delivery: RabbitDelivery) =>
            handle(route.routingKey, payload, delivery.properties.messageId),
        );

        consumers.push(consumer);
      }

      for (const queue of gatewayDeadLetterQueues) {
        const consumer = yield* messaging.consume(
          {
            queue: queue.name,
            prefetch: 1,
            failurePolicy: { strategy: "requeue" },
          },
          (delivery) =>
            Effect.logError("Gateway RabbitMQ delivery reached DLQ").pipe(
              Effect.annotateLogs({
                queue: queue.name,
                routingKey: queue.routingKey,
                messageId: delivery.properties.messageId,
                retryCount:
                  delivery.properties.headers?.["x-lootlog-retry-count"] ?? 0,
                ...deadLetterIdentifiers(delivery.content),
              }),
            ),
        );

        consumers.push(consumer);
      }
    });
  }

  stop(): Effect.Effect<void, MessagingError> {
    const consumers = [...this.consumers];

    return Effect.gen(function* () {
      for (const consumer of consumers) yield* consumer.cancel;
    }).pipe(Effect.tap(() => Effect.sync(() => (this.consumers = []))));
  }

  private handle<Key extends ConsumedRoutingKey>(
    routingKey: Key,
    payload: CanonicalRabbitEvent<Key>,
    messageId?: string,
  ): Effect.Effect<void, unknown> {
    return runBridgeRoute(this.routes, routingKey, payload, messageId);
  }
}
