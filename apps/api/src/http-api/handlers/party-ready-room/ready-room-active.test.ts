import { expect, it } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";
import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";
import { PartyReadyRoomAggregateSchema } from "@lootlog/schema/party-ready-room";
import {
  COMMIT_READY_ROOM_SCRIPT,
  EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
} from "#src/messaging/ready-room/ready-room-redis-scripts";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../../test/organization-fixtures.js";
import { PartyReadyRoomGroup } from "../../contracts/party-ready-room/api.js";
import { BearerSecurityMiddleware } from "../../contracts/shared.js";
import {
  PartyReadyRoomHandlers,
  ReadyRoomAuthorization,
} from "./party-ready-room.handlers.js";
import { makeReadyRoomDataLayer } from "./ready-room.data-layer.js";
import type { ReadyRoomRedis } from "./ready-room.repository.js";

it("encodes minimal and NPC discovery summaries without leaking hidden Organizations", async () => {
  const databaseBoundary = await createDatabaseBoundary();
  const caller = { userId: "user", discordId: "owner" };
  const clock = () => Date.parse("2026-09-09T10:00:00Z");
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
    expiresAt: new Date(clock() + 60_000).toISOString(),
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
  ];
  const redis: ReadyRoomRedis = {
    getJson: (key, schema) => {
      const room = rooms.find((room) =>
        key.endsWith(`:${room.notificationId}`),
      );
      return room
        ? Schema.decodeUnknownEffect(schema)(room)
        : Effect.succeed(null);
    },
    eval: (script, _keys, args) => {
      if (
        script === COMMIT_READY_ROOM_SCRIPT ||
        script === EXIT_READY_ROOM_PARTICIPANT_SCRIPT
      ) {
        const next = Schema.decodeUnknownSync(
          Schema.fromJsonString(PartyReadyRoomAggregateSchema),
        )(String(args[1]));
        const index = rooms.findIndex(
          (room) => room.notificationId === next.notificationId,
        );
        rooms[index] = next;
        return Effect.succeed(["COMMITTED"]);
      }
      return Effect.succeed(rooms.map((room) => room.notificationId));
    },
  };
  const services = Layer.mergeAll(
    makeReadyRoomDataLayer(
      redis,
      {
        publish: () => Effect.void,
        endPartyGatheringMessages: () => Effect.void,
      },
      clock,
    ),
    Layer.succeed(ReadyRoomAuthorization, { identity: Effect.succeed(caller) }),
  ).pipe(Layer.provide(Layer.succeed(ApiDatabase, databaseBoundary.database)));
  const boundary = HttpRouter.toWebHandler(
    HttpApiBuilder.layer(
      HttpApi.make("LootlogApi").add(PartyReadyRoomGroup),
    ).pipe(
      Layer.provide(PartyReadyRoomHandlers),
      Layer.provide(
        Layer.succeed(BearerSecurityMiddleware, {
          bearer: (effect) =>
            Effect.provideService(effect, ForwardAuthIdentity, caller),
        }),
      ),
      HttpRouter.provideRequest(services),
      Layer.provide(BunHttpServer.layerHttpServices),
      Layer.provide(apiKeyEndpointPolicyLayer("main")),
    ),
    { disableLogger: true },
  );
  try {
    await databaseBoundary.run(
      databaseBoundary.database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "visible", ownerId: "owner" }),
          createGuildFixture({ id: "hidden", ownerId: "other" }),
        ]),
    );
    const response = await boundary.handler(
      new Request(
        "http://api.test/messaging/party-gathering/active?world=experimental",
        { headers: { authorization: "Bearer test" } },
      ),
    );
    expect(response.status).toBe(200);
    const summary = {
      notificationId: "minimal",
      organizerName: "Author",
      applicantCount: 0,
      inPartyCount: 0,
      guildIds: ["visible"],
      world: "experimental",
      createdAt: base.createdAt,
      expiresAt: base.expiresAt,
    };
    expect(await response.json()).toEqual([
      summary,
      {
        ...summary,
        notificationId: "npc",
        applicantCount: 2,
        description: "",
        minLvl: 1,
        maxLvl: 500,
        npc: { name: "NPC", location: "Map", lvl: 100, type: "HERO" },
      },
      {
        ...summary,
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
    ]);
    const observation = await boundary.handler(
      new Request(
        "http://api.test/messaging/party-gathering/npc/party-observation",
        {
          method: "POST",
          headers: {
            authorization: "Bearer test",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            organizerAccountId: "1",
            organizerCharacterId: "2",
            memberCharacterIds: ["2", "3", "unregistered-party-member"],
          }),
        },
      ),
    );
    expect(observation.status).toBe(201);
    const afterObservation = await boundary.handler(
      new Request(
        "http://api.test/messaging/party-gathering/active?world=experimental",
        { headers: { authorization: "Bearer test" } },
      ),
    );
    expect(await afterObservation.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: "npc",
          applicantCount: 2,
          inPartyCount: 1,
        }),
      ]),
    );
    const withdrawal = await boundary.handler(
      new Request(
        "http://api.test/messaging/party-gathering/npc/applications/me",
        {
          method: "DELETE",
          headers: {
            authorization: "Bearer test",
            "content-type": "application/json",
          },
          body: JSON.stringify({ participantId: "alternate" }),
        },
      ),
    );
    expect(withdrawal.status).toBe(200);
    const afterWithdrawal = await boundary.handler(
      new Request(
        "http://api.test/messaging/party-gathering/active?world=experimental",
        { headers: { authorization: "Bearer test" } },
      ),
    );
    expect(await afterWithdrawal.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: "npc",
          applicantCount: 1,
          inPartyCount: 0,
        }),
      ]),
    );
  } finally {
    await boundary.dispose();
    await databaseBoundary.dispose();
  }
});
