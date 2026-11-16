import {
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
  gatewayConsumerSpecs,
  gatewayDeadLetterSpecs,
  type ConsumedRoutingKey,
} from "#src/rabbit/gateway-queues";

export class RabbitBridge {
  /** Consumes the Gateway's queues for as long as the replica runs. */
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
      for (const spec of gatewayConsumerSpecs) {
        const consumer = yield* messaging.consume(
          {
            queue: spec.queue,
            prefetch: spec.prefetch ?? 1,
            failurePolicy:
              spec.retryRoutingKey && spec.deadLetterRoutingKey
                ? {
                    strategy: "retry",
                    maxRetries: 3,
                    retryRoutingKey: spec.retryRoutingKey,
                    deadLetterRoutingKey: spec.deadLetterRoutingKey,
                  }
                : { strategy: "nack" },
          },
          (delivery: RabbitDelivery) =>
            handle(
              spec.routingKey,
              new TextDecoder().decode(delivery.content),
              delivery.properties.messageId,
            ),
        );

        consumers.push(consumer);
      }

      for (const spec of gatewayDeadLetterSpecs) {
        const consumer = yield* messaging.consume(
          {
            queue: spec.queue,
            prefetch: 1,
            failurePolicy: { strategy: "requeue" },
          },
          (delivery) =>
            Effect.logError("Gateway RabbitMQ delivery reached DLQ").pipe(
              Effect.annotateLogs({
                queue: spec.queue,
                routingKey: spec.routingKey,
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

  private handle(
    routingKey: ConsumedRoutingKey,
    serializedPayload: string,
    messageId?: string,
  ): Effect.Effect<void, unknown> {
    return runBridgeRoute(
      this.routes,
      routingKey,
      serializedPayload,
      messageId,
    );
  }
}
