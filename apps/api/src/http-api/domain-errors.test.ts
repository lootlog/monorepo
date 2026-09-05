import { describe, expect, it } from "bun:test";
import { Effect, FileSystem, Layer, Path } from "effect";
import { Etag, HttpPlatform } from "effect/unstable/http";
import { HttpApiTest } from "effect/unstable/httpapi";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import { EventTimersError } from "#src/events/respawn/event-timers.port";
import { BearerSecurityMiddleware } from "./contracts/shared.js";
import { LootlogApi } from "./lootlog-api.js";
import {
  EventsHandlers,
  EventsAuthorization,
  type AuthorizedEventCaller,
} from "./handlers/events/events.handlers.js";
import { EventOperations } from "./handlers/events/events.data-layer.js";
import {
  TimersHandlers,
  TimersAuthorization,
  TimersData,
  type TimersGuildAccess,
} from "./handlers/timers/timers.handlers.js";
import { toTimersDataFailure } from "./handlers/timers/timer-errors.js";
import {
  NotificationsHandlers,
  NotificationsAuthorization,
} from "./handlers/notifications/notifications.handlers.js";
import { NotificationOperations } from "./handlers/notifications/notifications.data-layer.js";

const identity = { userId: "user-1", discordId: "discord-1" };
const platform = Layer.mergeAll(
  Path.layer,
  Etag.layerWeak,
  HttpPlatform.layer,
).pipe(Layer.provideMerge(FileSystem.layerNoop({})));
const bearer = Layer.succeed(
  BearerSecurityMiddleware,
  BearerSecurityMiddleware.of({
    bearer: (effect) =>
      Effect.provideService(effect, ForwardAuthIdentity, identity),
  }),
);

// Fail only at the operation boundary; the real HTTP handler and serializer run below.
const failingOperations = <A>(failure: unknown): A =>
  new Proxy(
    {},
    {
      get: () => new Proxy({}, { get: () => () => Effect.fail(failure) }),
    },
  ) as A;

const run = (
  effect: Effect.Effect<{ status: number; text: string }, unknown, unknown>,
) =>
  Effect.runPromise(
    effect as Effect.Effect<{ status: number; text: string }, unknown>,
  );

describe("domain errors across the HTTP boundary", () => {
  it.each([
    {
      message: "USER_DM_TEST_TRIGGER_LIMIT_REACHED",
      limit: 3,
      windowSeconds: 3600,
      nextAvailableAt: "2026-09-05T15:00:00Z",
    },
    { message: "USER_DISCORD_DM_TARGET_MUST_BE_ACTIVE_AND_CAN_SEND" },
  ])("preserves notification conflict $message", async (body) => {
    const result = await run(
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* HttpApiTest.groups(LootlogApi, [
            "notifications",
          ]).pipe(
            Effect.provide(NotificationsHandlers),
            Effect.provide(bearer),
          );
          const response =
            yield* client.notifications.NotificationsUserControllerTriggerUserTargetTest(
              {
                params: { targetId: 1 },
                responseMode: "response-only",
              },
            );
          return { status: response.status, text: yield* response.text };
        }),
      ).pipe(
        Effect.provideService(
          NotificationsAuthorization,
          NotificationsAuthorization.of({
            requireCaller: Effect.succeed(identity),
            requireGuild: () =>
              Effect.die("unexpected organization authorization"),
          }),
        ),
        Effect.provideService(
          NotificationOperations,
          failingOperations<NotificationOperations["Service"]>(
            new ResourceConflictError(body),
          ),
        ),
        Effect.provide(platform),
      ),
    );
    expect(result.status).toBe(409);
    expect(JSON.parse(result.text)).toEqual(body);
  });

  it("keeps a timer lock race a conflict through the event endpoint", async () => {
    const body = { message: "TIMER_RACE_CONDITION" };
    const result = await run(
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* HttpApiTest.groups(LootlogApi, ["events"]).pipe(
            Effect.provide(EventsHandlers),
            Effect.provide(bearer),
          );
          const response =
            yield* client.events.EventsMonitoringControllerCloseRespawnWindow({
              params: {
                guildId: "guild-1",
                eventId: "event-1",
                heroId: "hero-1",
              },
              payload: {},
              responseMode: "response-only",
            });
          return { status: response.status, text: yield* response.text };
        }),
      ).pipe(
        Effect.provideService(
          EventsAuthorization,
          EventsAuthorization.of({
            requireGuild: () =>
              Effect.succeed({
                ...identity,
                guild: { id: "guild-1" } as AuthorizedEventCaller["guild"],
                member: {} as AuthorizedEventCaller["member"],
                roles: [],
                accessPolicy: createAccessPolicy({ capabilities: [] }),
              }),
          }),
        ),
        Effect.provideService(
          EventOperations,
          failingOperations<EventOperations["Service"]>(
            new EventTimersError({
              operation: "eventTimers.closeRespawn",
              cause: new ResourceConflictError(body),
            }),
          ),
        ),
        Effect.provide(platform),
      ),
    );
    expect(result.status).toBe(409);
    expect(JSON.parse(result.text)).toEqual(body);
  });
  it("preserves the reason when restoring a timer conflicts", async () => {
    const body = { message: "EXISTING_TIMER" };
    const failure = toTimersDataFailure(new ResourceConflictError(body));
    const result = await run(
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* HttpApiTest.groups(LootlogApi, ["timers"]).pipe(
            Effect.provide(TimersHandlers),
            Effect.provide(bearer),
          );
          const response =
            yield* client.timers.TimersControllerRestoreTimerFromHistory({
              params: { guildId: "guild-1", historyEntryId: "1" },
              responseMode: "response-only",
            });
          return { status: response.status, text: yield* response.text };
        }),
      ).pipe(
        Effect.provideService(
          TimersAuthorization,
          TimersAuthorization.of({
            identity: Effect.succeed(identity),
            requireGuild: () =>
              Effect.succeed({
                ...identity,
                guild: { id: "guild-1" } as TimersGuildAccess["guild"],
                roles: [],
                accessPolicy: createAccessPolicy({ capabilities: [] }),
              }),
          }),
        ),
        Effect.provideService(
          TimersData,
          new Proxy(
            {},
            { get: () => () => Effect.fail(failure) },
          ) as TimersData["Service"],
        ),
        Effect.provide(platform),
      ),
    );
    expect(result.status).toBe(409);
    expect(JSON.parse(result.text)).toEqual(body);
  });
});
