import { expect, it } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";
import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";
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
    eval: () => Effect.succeed(rooms.map((room) => room.notificationId)),
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
  } finally {
    await boundary.dispose();
    await databaseBoundary.dispose();
  }
});
