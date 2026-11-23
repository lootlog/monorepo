import { SchemaErrorResponseLive } from "@lootlog/protocol/http/schema-error-response";
import { spyOn } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApi, HttpApiBuilder } from "effect/http-api";
import { apiKeyEndpointPolicyLayer } from "@lootlog/protocol/http/api-key-http";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  type PartyGatheringUpdateEnvelope,
  PartyReadyRoomAggregateSchema,
} from "@lootlog/schema/party-ready-room";
import {
  COMMIT_READY_ROOM_SCRIPT,
  CREATE_READY_ROOM_SCRIPT,
  EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
  JOIN_READY_ROOM_SCRIPT,
  TERMINATE_READY_ROOM_SCRIPT,
} from "#src/messaging/ready-room/ready-room-redis-scripts";
import type { ForwardAuthIdentityValue } from "@lootlog/schema/api-key-policy";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { PartyReadyRoomGroup } from "#src/contracts/party-ready-room/api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import {
  PartyReadyRoomHandlers,
  ReadyRoomAuthorization,
} from "./party-ready-room.handlers.js";
import { makeReadyRoomDataLayer } from "#src/messaging/ready-room/ready-room.data-layer";
import type { ReadyRoomRedis } from "#src/messaging/ready-room/ready-room.repository";

type ReadyRoomActiveState = {
  caller: ForwardAuthIdentityValue;
  now: number;
  closeDatabaseOnCommit: boolean;
  emptyIndex: boolean;
  delayNextCommit: boolean;
};

export const createReadyRoomActiveHarness = async () => {
  const databaseBoundary = await createDatabaseBoundary();

  const state: ReadyRoomActiveState = {
    caller: {
      userId: "user",
      discordId: "owner",
    },
    now: Date.parse("2026-09-09T10:00:00Z"),
    closeDatabaseOnCommit: false,
    emptyIndex: false,
    delayNextCommit: false,
  };

  const clock = () => state.now;

  const base: ReadyRoomAggregate = {
    schemaVersion: 3,
    notificationId: "minimal",
    organizerDiscordId: "owner",
    organizerCharacter: {
      accountId: "1",
      characterId: "2",
      nick: "Author",
      lvl: 100,
      prof: "w",
      icon: "icon",
    },
    guildIds: ["visible", "hidden"],
    world: "experimental",
    status: "ACTIVE",
    revision: 1,
    createdAt: new Date(clock()).toISOString(),
    updatedAt: new Date(clock()).toISOString(),
    expiresAt: new Date(clock() + 10 * 60_000).toISOString(),
    participants: {},
  };

  const rooms: ReadyRoomAggregate[] = [
    base,
    {
      ...base,
      notificationId: "npc",
      description: "",
      minLvl: 1,
      maxLvl: 500,
      npc: { name: "NPC", location: "Map", lvl: 100, type: "HERO" },
      participants: {
        organizer: {
          participantId: "organizer",
          discordId: "owner",
          character: base.organizerCharacter,
          partyPresence: "IN_PARTY",
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
        },
        alternate: {
          participantId: "alternate",
          discordId: "owner",
          character: { ...base.organizerCharacter, characterId: "3" },
          partyPresence: "OUTSIDE",
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
        },
        other: {
          participantId: "other",
          discordId: "other",
          character: {
            ...base.organizerCharacter,
            accountId: "4",
            characterId: "5",
          },
          partyPresence: "OUTSIDE",
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
        },
      },
    },
    {
      ...base,
      notificationId: "coordinates",
      npc: {
        name: "NPC",
        location: "Map",
        lvl: 100,
        type: "HERO",
        icon: "npc.gif",
        prof: "w",
        x: 0,
        y: 12,
      },
    },
    { ...base, notificationId: "hidden", guildIds: ["hidden"] },
    {
      ...base,
      notificationId: "own-filtered",
      npc: { name: "Training NPC", location: "Map", lvl: 0, type: "TITAN" },
    },
  ];

  const olderCommitStarted = Promise.withResolvers<void>();
  const releaseOlderCommit = Promise.withResolvers<void>();
  const gatheringEvents: unknown[] = [];
  const cancellationEvents: unknown[] = [];
  const stateEvents: PartyGatheringUpdateEnvelope[] = [];

  const redis: ReadyRoomRedis = {
    getJson: (key, schema) => {
      const room = rooms.find((room) =>
        key.endsWith(`:${room.notificationId}`),
      );

      return room
        ? Schema.decodeEffect(schema)(room).pipe(Effect.orDie)
        : Effect.succeed(null);
    },
    eval: (script, _keys, args) => {
      if (script === CREATE_READY_ROOM_SCRIPT) {
        rooms.push(
          Schema.decodeSync(
            Schema.fromJsonString(PartyReadyRoomAggregateSchema),
          )(String(args[1])),
        );

        return Effect.succeed(["CREATED"]);
      }

      if (
        script === TERMINATE_READY_ROOM_SCRIPT ||
        script === COMMIT_READY_ROOM_SCRIPT ||
        script === JOIN_READY_ROOM_SCRIPT ||
        script === EXIT_READY_ROOM_PARTICIPANT_SCRIPT
      ) {
        const next = Schema.decodeSync(
          Schema.fromJsonString(PartyReadyRoomAggregateSchema),
        )(String(args[1]));

        const expected = Schema.decodeSync(
          Schema.fromJsonString(PartyReadyRoomAggregateSchema),
        )(String(args[0]));

        return Effect.gen(function* () {
          if (script === COMMIT_READY_ROOM_SCRIPT && state.delayNextCommit) {
            state.delayNextCommit = false;
            olderCommitStarted.resolve();
            yield* Effect.promise(() => releaseOlderCommit.promise);
          }

          const index = rooms.findIndex(
            (room) => room.notificationId === next.notificationId,
          );

          if (rooms[index]?.revision !== expected.revision) return ["CONFLICT"];

          rooms[index] = next;

          if (state.closeDatabaseOnCommit)
            yield* Effect.promise(() => databaseBoundary.dispose());

          return ["COMMITTED"];
        });
      }

      return Effect.succeed(
        state.emptyIndex ? [] : rooms.map((room) => room.notificationId),
      );
    },
  };

  const services = Layer.mergeAll(
    makeReadyRoomDataLayer(
      redis,
      {
        publish: () => Effect.void,
        publishGatheringUpdate: (event) =>
          Effect.sync(() => {
            stateEvents.push(event);
          }),
        publishCancellation: (payload) =>
          Effect.sync(() => {
            cancellationEvents.push(payload);
          }),
        publishGathering: (payload) =>
          Effect.sync(() => {
            gatheringEvents.push(payload);
          }),
        endPartyGatheringMessages: () => Effect.void,
      },
      clock,
    ),
    Layer.succeed(ReadyRoomAuthorization, {
      identity: Effect.sync(() => state.caller),
    }),
  ).pipe(Layer.provide(Layer.succeed(ApiDatabase, databaseBoundary.database)));

  const boundary = HttpRouter.toWebHandler(
    HttpApiBuilder.layer(
      HttpApi.make("LootlogApi").add(PartyReadyRoomGroup),
    ).pipe(
      Layer.provide(PartyReadyRoomHandlers),
      Layer.provide(
        Layer.succeed(BearerSecurityMiddleware, {
          bearer: (effect) =>
            Effect.provideService(effect, ForwardAuthIdentity, state.caller),
        }),
      ),
      HttpRouter.provideRequest(services),
      Layer.provide(BunHttpServer.layerHttpServices),
      Layer.provide(apiKeyEndpointPolicyLayer("main")),
      Layer.provide(SchemaErrorResponseLive),
    ),
    { disableLogger: true },
  );

  const unsafe = databaseBoundary.database.$client.unsafe.bind(
    databaseBoundary.database.$client,
  );

  const querySpy = spyOn(
    databaseBoundary.database.$client,
    "unsafe",
  ).mockImplementation((...args) => unsafe(...args));

  const get = (path: string) =>
    boundary.handler(
      new Request(`http://api.test${path}`, {
        headers: { authorization: "Bearer test" },
      }),
    );

  const send = <Body>(method: string, path: string, body: Body) =>
    boundary.handler(
      new Request(`http://api.test${path}`, {
        method,
        headers: {
          authorization: "Bearer test",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );

  return {
    state,
    databaseBoundary,
    base,
    rooms,
    olderCommitStarted,
    releaseOlderCommit,
    gatheringEvents,
    cancellationEvents,
    stateEvents,
    boundary,
    querySpy,
    get,
    send,
  };
};
