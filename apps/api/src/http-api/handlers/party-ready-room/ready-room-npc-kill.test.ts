import { expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { PartyReadyRoomAggregateSchema } from "@lootlog/schema/party-ready-room";
import {
  FIND_ACTIVE_READY_ROOM_IDS_SCRIPT,
  TERMINATE_READY_ROOM_SCRIPT,
} from "#src/messaging/ready-room/ready-room-redis-scripts";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { ReadyRoomData } from "./party-ready-room.handlers.js";
import { makeReadyRoomDataLayer } from "./ready-room.data-layer.js";
import type { ReadyRoomRedis } from "./ready-room.repository.js";

it("ends only gatherings whose every Lootlog recorded the kill", async () => {
  const databaseBoundary = await createDatabaseBoundary();
  const now = Date.parse("2026-11-06T10:00:00Z");
  const timestamp = new Date(now).toISOString();

  const room = (
    notificationId: string,
    guildIds: string[],
    npc: ReadyRoomAggregate["npc"],
  ): ReadyRoomAggregate => ({
    schemaVersion: 3,
    notificationId,
    organizerDiscordId: `${notificationId}-organizer`,
    organizerCharacter: {
      accountId: `${notificationId}-account`,
      characterId: `${notificationId}-character`,
      nick: "Organizer",
      lvl: 100,
      prof: "w",
      icon: "icon",
    },
    guildIds,
    world: "experimental",
    status: "ACTIVE",
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: new Date(now + 10 * 60_000).toISOString(),
    participants: {},
    ...(npc && { npc }),
  });

  const killed = { id: 7, name: "Kic", location: "Mapa", lvl: 80, type: "E2" };

  const rooms = [
    room("killed", ["killer"], killed),
    room("killed-in-both", ["killer", "second-killer"], killed),
    // The same NPC gathered for by another Organization stays open.
    room("other-lootlog", ["other"], killed),
    // Ending a shared gathering would tell the other Lootlog about the kill.
    room("shared-with-other", ["killer", "other"], killed),
    room("other-npc", ["killer"], { ...killed, id: 8 }),
    room("other-map", ["killer"], { ...killed, location: "Inna mapa" }),
    room("no-npc", ["killer"], undefined),
  ];

  const endedMessages: unknown[] = [];

  const redis: ReadyRoomRedis = {
    getJson: (key, schema) => {
      const found = rooms.find((entry) =>
        key.endsWith(`:${entry.notificationId}`),
      );

      return found
        ? Schema.decodeUnknownEffect(schema)(found)
        : Effect.succeed(null);
    },
    eval: (script, keys, args) => {
      if (script === FIND_ACTIVE_READY_ROOM_IDS_SCRIPT) {
        // Discovery keys are per Organization, so only its rooms are listed.
        return Effect.succeed(
          rooms.flatMap((entry) =>
            entry.guildIds.some((guildId) =>
              keys.some((key) => key.includes(`:${guildId}:`)),
            )
              ? [entry.notificationId]
              : [],
          ),
        );
      }

      if (script === TERMINATE_READY_ROOM_SCRIPT) {
        const next = Schema.decodeUnknownSync(
          Schema.fromJsonString(PartyReadyRoomAggregateSchema),
        )(String(args[1]));

        const index = rooms.findIndex(
          (entry) => entry.notificationId === next.notificationId,
        );

        rooms[index] = next;

        return Effect.succeed(["COMMITTED"]);
      }

      return Effect.succeed([]);
    },
  };

  try {
    await Effect.runPromise(
      Effect.gen(function* () {
        const readyRooms = yield* ReadyRoomData;
        yield* readyRooms.npcKilled({
          guildIds: ["killer", "second-killer"],
          world: "experimental",
          npcId: 7,
          location: "Mapa",
        });
      }).pipe(
        Effect.provide(
          makeReadyRoomDataLayer(
            redis,
            {
              publish: () => Effect.void,
              publishGatheringUpdate: () => Effect.void,
              publishCancellation: () => Effect.void,
              publishGathering: () => Effect.void,
              endPartyGatheringMessages: (notificationId, _guildIds, reason) =>
                Effect.sync(() => {
                  endedMessages.push({ notificationId, reason });
                }),
            },
            () => now,
          ).pipe(
            Layer.provide(
              Layer.succeed(ApiDatabase, databaseBoundary.database),
            ),
          ),
        ),
      ),
    );

    expect(
      Object.fromEntries(
        rooms.map(({ notificationId, status }) => [notificationId, status]),
      ),
    ).toEqual({
      killed: "CANCELLED",
      "killed-in-both": "CANCELLED",
      "other-lootlog": "ACTIVE",
      "shared-with-other": "ACTIVE",
      "other-npc": "ACTIVE",
      "other-map": "ACTIVE",
      "no-npc": "ACTIVE",
    });
    expect(endedMessages).toEqual([
      { notificationId: "killed", reason: "NPC_KILLED" },
      { notificationId: "killed-in-both", reason: "NPC_KILLED" },
    ]);
  } finally {
    await databaseBoundary.dispose();
  }
});
