import { RabbitMessaging } from "@lootlog/messaging";
import { UserOnlineEventV1 } from "@lootlog/protocol/rabbit/events";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  verifyActivityEventSignature,
} from "@lootlog/protocol/rabbit/activity-signature";
import {
  RabbitExchange,
  RabbitRoutingKey,
  makeDeadLetterQueue,
  makeRetryQueue,
} from "@lootlog/protocol/rabbit/topology";
import { Clock, Effect, Layer, Redacted, Schema, Schedule } from "effect";
import { ActivityConfig } from "#src/config/activity-config";
import { OnlineRepository } from "./online-repository.js";

export const onlineQueues = [
  {
    name: "activity-user-online-checkpoint-v1",
    exchange: RabbitExchange.DEFAULT,
    routingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1,
    durable: true,
    singleActiveConsumer: true,
    deadLetterExchange: RabbitExchange.RETRY,
    deadLetterRoutingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1_RETRY,
  },
  makeRetryQueue({
    name: "activity-user-online-checkpoint-v1.retry",
    retryRoutingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1_RETRY,
    destinationRoutingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1,
  }),
  makeDeadLetterQueue({
    name: "activity-user-online-checkpoint-v1.dlq",
    routingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1_DLQ,
  }),
];
const decode = Schema.decodeUnknownSync(UserOnlineEventV1);
export const OnlineConsumer = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const repository = yield* OnlineRepository;
    const config = yield* ActivityConfig;
    yield* rabbit.consume(
      {
        queue: "activity-user-online-checkpoint-v1",
        prefetch: 1,
        failurePolicy: { strategy: "nack" },
      },
      (delivery) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const parsed = yield* Effect.try(() => {
            const payload: unknown = JSON.parse(
              new TextDecoder().decode(delivery.content),
            );
            const signature =
              delivery.properties.headers?.[ACTIVITY_EVENT_SIGNATURE_HEADER];
            if (
              !verifyActivityEventSignature({
                payload,
                secret: Redacted.value(config.signatureSecret),
                signature:
                  typeof signature === "string" ? signature : undefined,
              })
            )
              throw new Error("Invalid checkpoint signature");
            const event = decode(payload);
            if (Date.parse(event.observedAt) > now + 60_000)
              throw new Error("Future checkpoint observation");
            return event;
          }).pipe(Effect.result);
          if (parsed._tag === "Failure") {
            // Ack only after confirmed DLQ publication; do not consume and discard its evidence.
            yield* rabbit.publish({
              exchange: RabbitExchange.DEAD_LETTER,
              routingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1_DLQ,
              content: delivery.content,
              headers: {
                ...delivery.properties.headers,
                "x-error-type": "permanent",
                "x-validation-error": "Invalid signed online event",
              },
            });
            return;
          }
          // Hold this delivery unacked so health cannot overtake a failed checkpoint.
          // The single active consumer preserves ordering across replicas.
          yield* repository
            .ingest(parsed.success)
            .pipe(Effect.retry(Schedule.spaced("5 seconds")));
        }),
    );
    yield* repository.prune().pipe(
      Effect.catch(() =>
        Effect.logWarning("Online history retention cleanup failed"),
      ),
      Effect.repeat(Schedule.spaced("1 hour")),
      Effect.forkScoped,
    );
  }),
);
