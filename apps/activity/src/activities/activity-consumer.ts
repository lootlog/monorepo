import {
  consumeEvent,
  RabbitMessaging,
  UnprocessableDelivery,
} from "@lootlog/messaging";
import {
  consumerRoute,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  readActivityEventSignature,
  verifyActivityEventSignature,
} from "@lootlog/protocol/rabbit/activity-signature";
import { Effect, Layer, Redacted } from "effect";
import { ActivityRepository } from "./activity-repository.js";
import { decodeCreateActivity } from "./activity-model.js";
import { ActivityConfig } from "#src/config/activity-config";

const activityRoutes = {
  activityLog: consumerRoute(
    "activity-log-create",
    RabbitRoutingKey.ACTIVITY_LOG_CREATE,
    { failure: "retry" },
  ),
  memberRemoved: consumerRoute(
    "guilds-members-remove",
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
    { failure: "retry" },
  ),
};

export const activityQueues = Object.values(activityRoutes).flatMap(
  (route) => route.queues,
);

export const ActivityConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const repository = yield* ActivityRepository;
    const config = yield* ActivityConfig;

    yield* consumeEvent(rabbit, activityRoutes.activityLog, (event, delivery) =>
      Effect.try({
        try: () => {
          if (
            !verifyActivityEventSignature({
              payload: event,
              secret: Redacted.value(config.signatureSecret),
              signature: readActivityEventSignature(
                delivery.properties.headers?.[ACTIVITY_EVENT_SIGNATURE_HEADER],
              ),
            })
          ) {
            throw new Error("Invalid activity event signature");
          }

          return decodeCreateActivity(event);
        },
        catch: (cause) =>
          new UnprocessableDelivery({
            cause: new Error("Invalid activity event", { cause }),
          }),
      }).pipe(
        Effect.flatMap((activity) => repository.create(activity)),
        Effect.asVoid,
      ),
    );
    yield* consumeEvent(rabbit, activityRoutes.memberRemoved, (member) =>
      repository
        .clearActiveSessionsForMember({
          guildId: member.guildId,
          discordId: member.discordId,
        })
        .pipe(Effect.asVoid),
    );
  }),
);
