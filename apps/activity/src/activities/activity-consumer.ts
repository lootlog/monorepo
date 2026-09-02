import { RabbitMessaging, type RabbitDelivery } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
  makeDeadLetterQueue,
  makeRetryQueue,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { ActivityRepository } from "./activity-repository.js";
import {
  decodeCreateActivity,
  decodeGuildMemberRemoved,
} from "./activity-model.js";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  verifyActivityEventSignature,
} from "./utils/activity-event-signature.js";
import { ActivityConfig } from "#src/config/activity-config";

const mainQueue = (
  name: string,
  routingKey: RabbitQueueDefinition["routingKey"],
  retryRoutingKey: RabbitQueueDefinition["routingKey"],
): RabbitQueueDefinition => ({
  name,
  exchange: RabbitExchange.DEFAULT,
  routingKey,
  durable: true,
  deadLetterExchange: RabbitExchange.RETRY,
  deadLetterRoutingKey: retryRoutingKey,
});
export const activityQueues = [
  mainQueue(
    "activity-log-create",
    RabbitRoutingKey.ACTIVITY_LOG_CREATE,
    RabbitRoutingKey.ACTIVITY_LOG_CREATE_RETRY,
  ),
  makeRetryQueue({
    name: "activity-log-create.retry",
    retryRoutingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE,
  }),
  makeDeadLetterQueue({
    name: "activity-log-create.dlq",
    routingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ,
  }),
  mainQueue(
    "guilds-members-remove",
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
  ),
  makeRetryQueue({
    name: "guilds-members-remove.retry",
    retryRoutingKey: RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
  }),
  makeDeadLetterQueue({
    name: "guilds-members-remove.dlq",
    routingKey: RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
  }),
] as const;

const decodeJson = (delivery: RabbitDelivery): unknown =>
  JSON.parse(new TextDecoder().decode(delivery.content));
const retryCount = (delivery: RabbitDelivery): number => {
  const death = delivery.properties.headers?.["x-death"];
  if (!Array.isArray(death) || death.length === 0) return 0;
  const count = death[0]?.count;
  return typeof count === "number" ? count : 0;
};
const header = (delivery: RabbitDelivery, name: string): string | undefined => {
  const value = delivery.properties.headers?.[name];
  return Array.isArray(value)
    ? typeof value[0] === "string"
      ? value[0]
      : undefined
    : typeof value === "string"
      ? value
      : undefined;
};

export const ActivityConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const repository = yield* ActivityRepository;
    const config = yield* ActivityConfig;
    const publishDlq = (
      delivery: RabbitDelivery,
      routingKey:
        | typeof RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ
        | typeof RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
      errorHeaders: Record<string, unknown>,
    ) =>
      rabbit.publish({
        exchange: RabbitExchange.DEAD_LETTER,
        routingKey,
        content: delivery.content,
        contentType: delivery.properties.contentType ?? undefined,
        headers: {
          ...delivery.properties.headers,
          ...errorHeaders,
          "x-final-attempt": true,
          "x-sent-to-dlq-at": new Date().toISOString(),
        },
      });
    yield* rabbit.consume(
      {
        queue: "activity-log-create",
        prefetch: 1,
        failurePolicy: { strategy: "nack" },
      },
      (delivery) =>
        Effect.gen(function* () {
          const input = decodeJson(delivery);
          if (
            !verifyActivityEventSignature({
              payload: input,
              secret: config.signatureSecret,
              signature: header(delivery, ACTIVITY_EVENT_SIGNATURE_HEADER),
            })
          ) {
            yield* publishDlq(
              delivery,
              RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ,
              {
                "x-error-type": "permanent",
                "x-signature-error": "Invalid activity event signature",
              },
            );
            return;
          }
          let dto;
          try {
            dto = decodeCreateActivity(input);
          } catch {
            yield* publishDlq(
              delivery,
              RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ,
              {
                "x-validation-error": "Validation failed",
                "x-error-type": "permanent",
              },
            );
            return;
          }
          if (retryCount(delivery) >= 3) {
            yield* publishDlq(
              delivery,
              RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ,
              {},
            );
            return;
          }
          yield* repository.create(dto);
        }),
    );
    yield* rabbit.consume(
      {
        queue: "guilds-members-remove",
        prefetch: 1,
        failurePolicy: { strategy: "nack" },
      },
      (delivery) =>
        Effect.gen(function* () {
          const input = decodeJson(delivery);
          let dto;
          try {
            dto = decodeGuildMemberRemoved(input);
          } catch {
            yield* publishDlq(
              delivery,
              RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
              {
                "x-validation-error": "Validation failed",
                "x-error-type": "permanent",
              },
            );
            return;
          }
          if (retryCount(delivery) >= 3) {
            yield* publishDlq(
              delivery,
              RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
              {},
            );
            return;
          }
          yield* repository.clearActiveSessionsForMember({
            guildId: dto.guildId,
            discordId: dto.discordId,
          });
        }),
    );
    for (const queue of [
      "activity-log-create.dlq",
      "guilds-members-remove.dlq",
    ])
      yield* rabbit.consume(
        { queue, prefetch: 1, failurePolicy: { strategy: "requeue" } },
        (delivery) =>
          Effect.logWarning(
            "Activity DLQ message requires manual intervention",
            { queue, routingKey: delivery.routingKey },
          ),
      );
  }),
);
