import { describe, expect, it, mock } from "bun:test";
import {
  RabbitMessaging,
  UnprocessableDelivery,
  type FailurePolicy,
  type RabbitDelivery,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Cause, Effect, Exit, Layer, Option, Redacted, Schema } from "effect";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { ActivityConsumers, activityQueues } from "./activity-consumer.js";
import { ActivityRepository } from "./activity-repository.js";
import { ActivityConfig } from "#src/config/activity-config";

import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  signActivityEvent,
} from "@lootlog/protocol/rabbit/activity-signature";

const payload = {
  userId: "test-user",
  guildId: "test-organization",
  discordId: "test-discord",
  type: "CONNECT_EVENT",
  source: "WEB_APP",
  details: { sessionId: "test-session" },
  idempotencyKey: "test-connect",
};

const makeDelivery = (
  content: string,
  headers: NonNullable<RabbitDelivery["properties"]["headers"]> = {},
): RabbitDelivery => {
  const raw = {
    content: Buffer.from(content),
    fields: {
      consumerTag: "consumer-1",
      deliveryTag: 1,
      redelivered: false,
      exchange: RabbitExchange.DEFAULT,
      routingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE,
    },
    properties: {
      contentType: "application/json",
      contentEncoding: undefined,
      headers,
      deliveryMode: 2,
      priority: undefined,
      correlationId: undefined,
      replyTo: undefined,
      expiration: undefined,
      messageId: undefined,
      timestamp: undefined,
      type: undefined,
      userId: undefined,
      appId: undefined,
      clusterId: undefined,
    },
  } satisfies RabbitDelivery["raw"];

  return {
    content: new Uint8Array(raw.content),
    exchange: raw.fields.exchange,
    routingKey: raw.fields.routingKey,
    redelivered: raw.fields.redelivered,
    properties: raw.properties,
    raw,
  };
};

describe("Activity RabbitMQ topology", () => {
  it("keeps deployed queue names and routing keys", () => {
    expect(
      activityQueues.map(({ name, routingKey }) => [name, routingKey]),
    ).toEqual([
      ["activity-log-create", RabbitRoutingKey.ACTIVITY_LOG_CREATE],
      ["activity-log-create.retry", RabbitRoutingKey.ACTIVITY_LOG_CREATE_RETRY],
      ["activity-log-create.dlq", RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ],
      ["guilds-members-remove", RabbitRoutingKey.GUILDS_MEMBERS_REMOVE],
      [
        "guilds-members-remove.retry",
        RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
      ],
      ["guilds-members-remove.dlq", RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ],
    ]);
  });

  it("uses broker dead-lettering through the retry exchange", () => {
    const main = activityQueues[0];
    const retry = activityQueues[1];
    expect(main.deadLetterExchange).toBe(RabbitExchange.RETRY);
    expect(retry.messageTtl).toBe(30_000);
    expect(retry.deadLetterExchange).toBe(RabbitExchange.DEFAULT);
  });

  it.each(["malformed", "wrong-secret", "valid"] as const)(
    "handles %s activity and leaves dead letters available for recovery",
    async (scenario) => {
      const handlers = new Map<
        string,
        (delivery: RabbitDelivery) => Effect.Effect<void, unknown>
      >();

      const policies = new Map<string, FailurePolicy>();

      const publish = mock<RabbitMessagingService["publish"]>(
        () => Effect.void,
      );

      const create = mock(() => Effect.void);

      const rabbit = RabbitMessaging.of({
        publish,
        ack: () => Effect.void,
        nack: () => Effect.void,
        consume: (options, handler) => {
          handlers.set(options.queue, handler);
          policies.set(options.queue, options.failurePolicy);

          return Effect.succeed({
            consumerTag: options.queue,
            cancel: Effect.void,
          });
        },
      });

      const repository = ActivityRepository.of({
        create,
        clearActiveSessionsForMember: () => Effect.void,
        findMany: () => Effect.succeed({ data: [], hasMore: false }),
        findOne: () => Effect.die("unused"),
        deleteOne: () => Effect.die("unused"),
        memberStats: () => Effect.succeed([]),
        suggestActorNames: () => Effect.succeed([]),
        suggestWorlds: () => Effect.succeed([]),
        suggestClanNames: () => Effect.succeed([]),
      });

      const config = ActivityConfig.of({
        environment: RuntimeEnvironment.LOCAL,
        port: 0,
        serviceName: "activity-test",
        serviceNamespace: "test",
        databaseUrl: Redacted.make("postgresql://unused"),
        rabbitmqUri: Redacted.make("amqp://unused"),
        apiServiceUrl: "http://api.test",
        signatureSecret: Redacted.make("a".repeat(32)),
      });

      const outcome = await Effect.runPromise(
        Effect.gen(function* () {
          yield* Layer.build(
            ActivityConsumers.pipe(
              Layer.provide(Layer.succeed(RabbitMessaging, rabbit)),
              Layer.provide(Layer.succeed(ActivityRepository, repository)),
              Layer.provide(Layer.succeed(ActivityConfig, config)),
            ),
          );
          const handler = handlers.get("activity-log-create");

          if (!handler) return yield* Effect.die("consumer was not registered");

          const delivery =
            scenario === "malformed"
              ? makeDelivery("not-json")
              : makeDelivery(JSON.stringify(payload), {
                  [ACTIVITY_EVENT_SIGNATURE_HEADER]: signActivityEvent(
                    payload,
                    (scenario === "valid" ? "a" : "b").repeat(32),
                  ),
                });

          return yield* Effect.exit(handler(delivery));
        }).pipe(Effect.scoped),
      );

      // A successful handler is automatically ACKed by RabbitMessaging.
      // Registering a log-only DLQ handler would silently delete failed events.
      expect(handlers.has("activity-log-create.dlq")).toBe(false);
      expect(handlers.has("guilds-members-remove.dlq")).toBe(false);

      if (scenario === "valid") {
        expect(Exit.isSuccess(outcome)).toBe(true);
        expect(create).toHaveBeenCalledWith(payload);

        return;
      }

      // An unprocessable delivery skips retries and the retry policy routes it
      // to the dead-letter queue, where it stays available for recovery.
      expect(create).not.toHaveBeenCalled();
      expect(
        Exit.isFailure(outcome) &&
          Option.exists(
            Cause.findErrorOption(outcome.cause),
            Schema.is(UnprocessableDelivery),
          ),
      ).toBe(true);
      expect(policies.get("activity-log-create")).toMatchObject({
        strategy: "retry",
        deadLetterRoutingKey: RabbitRoutingKey.ACTIVITY_LOG_CREATE_DLQ,
      });
    },
  );
});
