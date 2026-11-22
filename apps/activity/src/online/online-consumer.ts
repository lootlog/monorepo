import { RabbitMessaging, type RabbitDelivery } from "@lootlog/messaging";
import { UserOnlineEventV1 } from "@lootlog/protocol/rabbit/events";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  readActivityEventSignature,
  verifyActivityEventSignature,
} from "@lootlog/protocol/rabbit/activity-signature";
import {
  consumerRoute,
  RabbitExchange,
  RabbitRoutingKey,
  deadLetterRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import {
  Clock,
  Effect,
  Layer,
  Redacted,
  Result,
  Schema,
  Schedule,
} from "effect";
import { ActivityConfig } from "#src/config/activity-config";
import { OnlineIngestRejected, OnlineRepository } from "./online-repository.js";

// Rejected deliveries return through the retry queue in order; a checkpoint
// that can never apply is dead-lettered by the consumer itself.
const onlineRoute = consumerRoute(
  "activity-user-online-checkpoint-v1",
  RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1,
  { failure: "broker-retry", singleActiveConsumer: true },
);

export const onlineQueues = onlineRoute.queues;

const decode = Schema.decodeUnknownSync(UserOnlineEventV1);

export const OnlineConsumer = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const repository = yield* OnlineRepository;
    const config = yield* ActivityConfig;

    const rejectEvent = (delivery: RabbitDelivery, message: string) =>
      rabbit.publish({
        exchange: RabbitExchange.DEAD_LETTER,
        routingKey: deadLetterRoutingKey(
          RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1,
        ),
        content: delivery.content,
        headers: {
          ...delivery.properties.headers,
          "x-error-type": "permanent",
          "x-validation-error": message,
        },
      });

    yield* rabbit.consume(
      {
        queue: onlineRoute.queue,
        prefetch: onlineRoute.prefetch,
        failurePolicy: onlineRoute.failurePolicy,
      },
      (delivery) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;

          const parsed = yield* Effect.try(() => {
            const payload: unknown = JSON.parse(
              new TextDecoder().decode(delivery.content),
            );

            if (
              !verifyActivityEventSignature({
                payload,
                secret: Redacted.value(config.signatureSecret),
                signature: readActivityEventSignature(
                  delivery.properties.headers?.[
                    ACTIVITY_EVENT_SIGNATURE_HEADER
                  ],
                ),
              })
            )
              throw new Error("Invalid checkpoint signature");
            const event = decode(payload);

            if (Date.parse(event.observedAt) > now + 60_000)
              throw new Error("Future checkpoint observation");

            return event;
          }).pipe(Effect.result);

          if (Result.isFailure(parsed)) {
            // Ack only after confirmed DLQ publication; do not consume and discard its evidence.
            yield* rejectEvent(delivery, "Invalid signed online event");

            return;
          }

          // Transient failures retain ordering: health cannot overtake a pending
          // checkpoint. Invalid intervals cannot recover and must release the queue.
          yield* repository.ingest(parsed.success).pipe(
            Effect.retry({
              schedule: Schedule.spaced("5 seconds"),
              while: (error) => !(error instanceof OnlineIngestRejected),
            }),
            Effect.catchIf(
              (error) => error instanceof OnlineIngestRejected,
              (error) => rejectEvent(delivery, error.message),
            ),
          );
        }),
    );
    yield* repository.prune.pipe(
      Effect.catch(() =>
        Effect.logWarning("Online history retention cleanup failed"),
      ),
      // The repository gates completed hours; poll sooner to recover failed batches.
      Effect.repeat(Schedule.spaced("1 minute")),
      Effect.forkScoped,
    );
  }),
);
