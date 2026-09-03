import { describe, expect, it, mock } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Effect } from "effect";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import {
  EventsBadRequest,
  EventsData,
  EventsNotFound,
  type AuthorizedEventCaller,
  type EventEndpointIdentifier,
  type EventRequest,
} from "./events.handlers.js";
import {
  eventDataLayer,
  type EventDataOperations,
} from "./events.data-layer.js";

const caller = {
  discordId: "discord-1",
  userId: "user-1",
  guild: { id: "guild-1" },
  member: { id: 1 },
  accessPolicy: createAccessPolicy({ capabilities: [] }),
  roles: [],
} as unknown as AuthorizedEventCaller;

const requestFor = (): EventRequest => ({
  params: {
    eventId: "event-1",
    heroId: "hero-1",
    killId: "kill-1",
    killPointId: "point-1",
    locationId: "location-1",
    mapId: "map-1",
    memberId: "1",
    rankingId: "ranking-1",
  },
  query: {
    activeOnly: "true",
    cursor: "cursor-1",
    heroId: "hero-1",
    limit: "20",
    memberId: "1",
    world: "Tempest",
  },
  payload: {},
});

const operationsWith = (
  operation: () => Promise<unknown>,
): EventDataOperations => {
  const service = new Proxy(
    {},
    { get: () => operation },
  ) as EventDataOperations["assignment"];
  const effectService = new Proxy(
    {},
    {
      get: () => () =>
        Effect.tryPromise({ try: operation, catch: (cause) => cause }),
    },
  );
  return {
    assignment: new Proxy(service, {
      get: (target, key, receiver) =>
        [
          "addHero",
          "addMap",
          "assignMember",
          "assignMapToLocation",
          "createLocation",
          "deleteHero",
          "deleteLocation",
          "deleteMap",
          "getLocations",
          "reorderLocations",
          "selfAssignMember",
          "selfUnassignMember",
          "updateHero",
          "updateLocation",
          "unassignMember",
        ].includes(String(key))
          ? Reflect.get(effectService, key, receiver)
          : Reflect.get(target, key, receiver),
    }) as unknown as EventDataOperations["assignment"],
    catalog: new Proxy(service, {
      get: (target, key, receiver) =>
        [
          "createEvent",
          "deleteEvent",
          "getEvent",
          "getEventMaps",
          "getEventOverview",
          "getEvents",
          "getWrapped",
          "recalculatePoints",
          "updateEvent",
        ].includes(String(key))
          ? Reflect.get(effectService, key, receiver)
          : Reflect.get(target, key, receiver),
    }) as unknown as EventDataOperations["catalog"],
    monitoring: new Proxy(service, {
      get: (target, key, receiver) =>
        [
          "getActiveGapsForHero",
          "getActiveGapForMap",
          "getCoordination",
          "closeRespawnWindow",
          "getHeroCoverageGaps",
          "getHeroPresenceStats",
          "getMapCoverageGaps",
          "openRespawnWindow",
          "getHeroRespawnConfig",
          "getKillTimelineData",
        ].includes(String(key))
          ? Reflect.get(effectService, key, receiver)
          : Reflect.get(target, key, receiver),
    }) as unknown as EventDataOperations["monitoring"],
    pins: new Proxy(
      {},
      {
        get: () => () =>
          Effect.tryPromise({ try: operation, catch: (cause) => cause }),
      },
    ) as EventDataOperations["pins"],
    ranking: new Proxy(service, {
      get: (target, key, receiver) =>
        [
          "getEventKillHistory",
          "getEventHeroStats",
          "getEventHeroTimers",
          "getPendingParticipationConfirmations",
          "getHeroKillHistory",
          "getKillDetail",
          "getMemberKillHistory",
          "getRanking",
          "acknowledgeExpiredParticipationConfirmations",
          "confirmParticipationForKill",
          "updateKillPoint",
          "updateRankingPoints",
        ].includes(String(key))
          ? Reflect.get(effectService, key, receiver)
          : Reflect.get(target, key, receiver),
    }) as unknown as EventDataOperations["ranking"],
  };
};

const execute = (
  operations: EventDataOperations,
  endpoint: EventEndpointIdentifier,
  request: EventRequest,
) =>
  Effect.runPromise(
    Effect.flatMap(EventsData, (data) =>
      data.execute(endpoint, request, caller),
    ).pipe(Effect.provide(eventDataLayer(operations))),
  );

describe("event data layer", () => {
  it("rejects a missing path identifier before module work", async () => {
    const operation = mock(() => Promise.resolve({ ok: true }));

    await expect(
      execute(operationsWith(operation), "showEvent", { params: {} }),
    ).rejects.toBeInstanceOf(EventsBadRequest);
    expect(operation).not.toHaveBeenCalled();
  });

  it("encodes event timestamps with the list response codec", async () => {
    const createdAt = new Date("2026-09-03T10:00:00.000Z");
    const event = {
      id: "event-1",
      guildId: "guild-1",
      name: "Titan run",
      world: "Tempest",
      active: true,
      startsAt: createdAt,
      endsAt: null,
      createdAt,
      updatedAt: createdAt,
      heroNpcs: [],
    };

    const result = await execute(
      operationsWith(() => Promise.resolve([event])),
      "listEvents",
      requestFor(),
    );

    expect(result).toEqual([
      {
        ...event,
        createdAt: createdAt.toISOString(),
        startsAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      },
    ]);
  });

  it("does not require an event identifier for the pinned-event collection", async () => {
    const operation = mock(() => Promise.resolve([]));

    await expect(
      execute(operationsWith(operation), "listPinnedEvents", {}),
    ).resolves.toEqual([]);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("maps application 404 failures to the typed event error", async () => {
    const notFound = new ResourceNotFoundError("not found");
    const operation = mock(() => Promise.reject(notFound));

    await expect(
      execute(operationsWith(operation), "showEvent", requestFor()),
    ).rejects.toBeInstanceOf(EventsNotFound);
  });
});
