import { expect, it } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";
import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
} from "#src/database/drizzle/schema";
import { PartyReadyRoomAggregateSchema } from "@lootlog/schema/party-ready-room";
import { Permission } from "@lootlog/schema/permissions";
import {
  COMMIT_READY_ROOM_SCRIPT,
  EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
  TERMINATE_READY_ROOM_SCRIPT,
} from "#src/messaging/ready-room/ready-room-redis-scripts";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { PartyReadyRoomGroup } from "../../contracts/party-ready-room/api.js";
import { BearerSecurityMiddleware } from "../../contracts/shared.js";
import {
  PartyReadyRoomHandlers,
  ReadyRoomAuthorization,
} from "./party-ready-room.handlers.js";
import { makeReadyRoomDataLayer } from "./ready-room.data-layer.js";
import type { ReadyRoomRedis } from "./ready-room.repository.js";

it("lets senders discover and cancel their own NPC gatherings outside read filters without leaking hidden Organizations", async () => {
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
    {
      ...base,
      notificationId: "own-filtered",
      npc: { name: "Training NPC", location: "Map", lvl: 0, type: "TITAN" },
    },
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
        script === TERMINATE_READY_ROOM_SCRIPT ||
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
          createGuildFixture({ id: "visible", ownerId: "different-owner" }),
          createGuildFixture({ id: "hidden", ownerId: "other" }),
        ]),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          guildId: "visible",
          userId: "owner",
          globalUserId: "user",
        }),
      ),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(roleTable).values({
        id: "sender",
        guildId: "visible",
        name: "Sender",
        updatedAt: new Date(),
        permissions: [
          Permission.LOOTLOG_NOTIFICATIONS_SEND,
          Permission.LOOTLOG_CHAT_READ,
        ],
        lvlRangeFrom: 200,
        lvlRangeTo: 500,
      }),
    );
    await databaseBoundary.run(
      databaseBoundary.database
        .insert(memberToRoleTable)
        .values({ A: 1, B: "sender" }),
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
      {
        ...summary,
        notificationId: "own-filtered",
        npc: { name: "Training NPC", location: "Map", lvl: 0, type: "TITAN" },
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
    const list = await boundary.handler(
      new Request("http://api.test/messaging/party-gathering", {
        headers: { authorization: "Bearer test" },
      }),
    );
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationId: "own-filtered",
          viewer: "ORGANIZER",
          guildIds: ["visible"],
        }),
      ]),
    );
    const detail = await boundary.handler(
      new Request("http://api.test/messaging/party-gathering/own-filtered", {
        headers: { authorization: "Bearer test" },
      }),
    );
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      notificationId: "own-filtered",
      revision: 1,
      viewer: "ORGANIZER",
      guildIds: ["visible"],
    });
    const cancel = await boundary.handler(
      new Request(
        "http://api.test/messaging/party-gathering/own-filtered/cancel",
        {
          method: "POST",
          headers: {
            authorization: "Bearer test",
            "content-type": "application/json",
          },
          body: JSON.stringify({ expectedRevision: 1 }),
        },
      ),
    );
    expect(cancel.status).toBe(201);
    expect(await cancel.json()).toMatchObject({
      type: "REMOVE",
      notificationId: "own-filtered",
    });
    expect(
      rooms.find((room) => room.notificationId === "own-filtered")?.status,
    ).toBe("CANCELLED");
  } finally {
    await boundary.dispose();
    await databaseBoundary.dispose();
  }
});
