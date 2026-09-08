import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect, FileSystem, Layer, Path } from "effect";
import { Etag, HttpPlatform, HttpRouter } from "effect/unstable/http";
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
} from "./handlers/events/events.handlers.js";
import { EventOperations } from "./handlers/events/events.data-layer.js";
import {
  TimersHandlers,
  TimersAuthorization,
  TimersData,
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

const unexpected = () => Effect.die("Unexpected operation");
const unusedEvents = {
  assignment: {
    assignMember: unexpected,
    selfAssignMember: unexpected,
    selfUnassignMember: unexpected,
    addHero: unexpected,
    updateHero: unexpected,
    deleteHero: unexpected,
    addMap: unexpected,
    deleteMap: unexpected,
    getLocations: unexpected,
    createLocation: unexpected,
    updateLocation: unexpected,
    deleteLocation: unexpected,
    reorderLocations: unexpected,
    assignMapToLocation: unexpected,
    unassignMember: unexpected,
  },
  catalog: {
    hydrateMutation: unexpected,
    getEvents: unexpected,
    getEvent: unexpected,
    getEventOverview: unexpected,
    getEventMaps: unexpected,
    getWrapped: unexpected,
    createEvent: unexpected,
    deleteEvent: unexpected,
    recalculatePoints: unexpected,
    updateEvent: unexpected,
  },
  monitoring: {
    getCoordination: unexpected,
    getKillTimelineData: unexpected,
    getHeroCoverageGaps: unexpected,
    getMapCoverageGaps: unexpected,
    getActiveGapForMap: unexpected,
    getActiveGapsForHero: unexpected,
    getHeroPresenceStats: unexpected,
    getHeroRespawnConfig: unexpected,
    closeRespawnWindow: unexpected,
    openRespawnWindow: unexpected,
  },
  pins: {
    listPinnedEvents: unexpected,
    pinEvent: unexpected,
    unpinEvent: unexpected,
  },
  ranking: {
    getPendingParticipationConfirmations: unexpected,
    acknowledgeExpiredParticipationConfirmations: unexpected,
    confirmParticipationForKill: unexpected,
    getRanking: unexpected,
    updateRankingPoints: unexpected,
    getEventHeroTimers: unexpected,
    getEventHeroStats: unexpected,
    getEventKillHistory: unexpected,
    getMemberKillHistory: unexpected,
    getHeroKillHistory: unexpected,
    getKillDetail: unexpected,
    updateKillPoint: unexpected,
  },
} satisfies EventOperations["Service"];
const unusedNotifications = {
  guildTargets: {
    available: unexpected,
    create: unexpected,
    list: unexpected,
    remove: unexpected,
    removeChannel: unexpected,
    update: unexpected,
  },
  userTargets: {
    create: unexpected,
    list: unexpected,
    remove: unexpected,
    triggerTest: unexpected,
    update: unexpected,
  },
  jobOperations: {
    cancelGuild: unexpected,
    listGuild: unexpected,
    listUser: unexpected,
  },
  rules: {
    createGuild: unexpected,
    createUser: unexpected,
    deleteGuild: unexpected,
    deleteUser: unexpected,
    listGuild: unexpected,
    listUser: unexpected,
    rebuildGuildJobs: unexpected,
    testGuild: unexpected,
    updateGuild: unexpected,
    updateUser: unexpected,
  },
  watchedItems: {
    create: unexpected,
    list: unexpected,
    quickAdd: unexpected,
    remove: unexpected,
  },
} satisfies NotificationOperations["Service"];
const unusedTimers = {
  getAll: unexpected,
  getRecentHistory: unexpected,
  getGuildTimers: unexpected,
  searchNpcs: unexpected,
  createAuto: unexpected,
  reset: unexpected,
  delete: unexpected,
  getHistory: unexpected,
  restore: unexpected,
  createManual: unexpected,
} satisfies TimersData["Service"];

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
    const result = await Effect.runPromise(
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
        Effect.provideService(NotificationOperations, {
          ...unusedNotifications,
          userTargets: {
            ...unusedNotifications.userTargets,
            triggerTest: () => Effect.fail(new ResourceConflictError(body)),
          },
        }),
        Effect.provide(platform),
      ),
    );
    expect(result.status).toBe(409);
    expect(JSON.parse(result.text)).toEqual(body);
  });

  it("keeps a timer lock race a conflict through the event endpoint", async () => {
    const body = { message: "TIMER_RACE_CONDITION" };
    const result = await Effect.runPromise(
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
                guild: createGuildFixture(),
                member: createMemberFixture(),
                roles: [],
                accessPolicy: createAccessPolicy({ capabilities: [] }),
              }),
          }),
        ),
        Effect.provideService(EventOperations, {
          ...unusedEvents,
          monitoring: {
            ...unusedEvents.monitoring,
            closeRespawnWindow: () =>
              Effect.fail(
                new EventTimersError({
                  operation: "eventTimers.closeRespawn",
                  cause: new ResourceConflictError(body),
                }),
              ),
          },
        }),
        Effect.provide(platform),
      ),
    );
    expect(result.status).toBe(409);
    expect(JSON.parse(result.text)).toEqual(body);
  });
  it("preserves the reason when restoring a timer conflicts", async () => {
    const body = { message: "EXISTING_TIMER" };
    const failure = toTimersDataFailure(new ResourceConflictError(body));
    const services = Layer.mergeAll(
      Layer.succeed(TimersAuthorization, {
        identity: Effect.succeed(identity),
        requireGuild: () =>
          Effect.succeed({
            ...identity,
            guild: createGuildFixture(),
            roles: [],
            accessPolicy: createAccessPolicy({ capabilities: [] }),
          }),
      }),
      Layer.succeed(TimersData, {
        ...unusedTimers,
        restore: () => Effect.fail(failure),
      }),
    );
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* HttpApiTest.groups(LootlogApi, ["timers"]).pipe(
            Effect.provide(
              TimersHandlers.pipe(HttpRouter.provideRequest(services)),
            ),
            Effect.provide(bearer),
          );
          const response =
            yield* client.timers.TimersControllerRestoreTimerFromHistory({
              params: { guildId: "guild-1", historyEntryId: "1" },
              responseMode: "response-only",
            });
          return { status: response.status, text: yield* response.text };
        }),
      ).pipe(Effect.provide(services), Effect.provide(platform)),
    );
    expect(result.status).toBe(409);
    expect(JSON.parse(result.text)).toEqual(body);
  });
});
