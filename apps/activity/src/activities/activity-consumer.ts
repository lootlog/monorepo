import {
  RabbitMessaging,
  UnprocessableDelivery,
  type RabbitDelivery,
} from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
  makeDeadLetterQueue,
  makeRetryQueue,
  type RabbitQueueDefinition,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { ActivityRepository } from "./activity-repository.js";
import {
  decodeCreateActivity,
  decodeGuildMemberRemoved,
} from "./activity-model.js";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  verifyActivityEventSignature,
} from "@lootlog/protocol/rabbit/activity-signature";
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

/**
 * Decodes a delivery or fails it as unprocessable, which the retry policy
 * sends straight to the dead-letter queue instead of retrying it.
 */
const decodeDelivery = <A>(
  delivery: RabbitDelivery,
  reason: string,
  decode: (input: Schema.Json) => A,
) =>
  Effect.try({
    try: () =>
      decode(
        Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Json))(
          new TextDecoder().decode(delivery.content),
        ),
      ),
    catch: (cause) =>
      new UnprocessableDelivery({ cause: new Error(reason, { cause }) }),
  });

const header = (delivery: RabbitDelivery, name: string): string | undefined => {
  const value = delivery.properties.headers?.[name];

  return Option.getOrUndefined(
    Schema.decodeUnknownOption(Schema.String)(
      Array.isArray(value) ? value[0] : value,
    ),
  );
};

const retryPolicy = (
  retryRoutingKey: RabbitRoutingKeyName,
  deadLetterRoutingKey: RabbitRoutingKeyName,
) =>
  ({
    strategy: "retry",
    maxRetries: 3,
    retryRoutingKey,
    deadLetterRoutingKey,
  }) as const;

export const ActivityConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const repository = yield* ActivityRepository;
    const config = yield* ActivityConfig;

    yield* rabbit.consume(
      {
        queue: "activity-log-create",
        prefetch: 1,
        failurePolicy: retryPolicy(
          RabbitRoutingKey.ACTIVITY_LOG_CREATE_RETRY,
          RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ,
        ),
      },
      (delivery) =>
        Effect.gen(function* () {
          const dto = yield* decodeDelivery(
            delivery,
            "Invalid activity event",
            (input) => {
              if (
                !verifyActivityEventSignature({
                  payload: input,
                  secret: Redacted.value(config.signatureSecret),
                  signature: header(delivery, ACTIVITY_EVENT_SIGNATURE_HEADER),
                })
              ) {
                throw new Error("Invalid activity event signature");
              }

              return decodeCreateActivity(input);
            },
          );

          yield* repository.create(dto);
        }),
    );
    yield* rabbit.consume(
      {
        queue: "guilds-members-remove",
        prefetch: 1,
        failurePolicy: retryPolicy(
          RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
          RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
        ),
      },
      (delivery) =>
        Effect.gen(function* () {
          const dto = yield* decodeDelivery(
            delivery,
            "Invalid member removal",
            decodeGuildMemberRemoved,
          );

          yield* repository.clearActiveSessionsForMember({
            guildId: dto.guildId,
            discordId: dto.discordId,
          });
        }),
    );
  }),
);
