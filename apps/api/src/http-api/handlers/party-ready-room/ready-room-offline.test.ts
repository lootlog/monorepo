import { expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { decodeRabbitEventJson } from "@lootlog/protocol/rabbit/events";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { PartyReadyRoomAggregateSchema } from "@lootlog/schema/party-ready-room";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  COMMIT_READY_ROOM_SCRIPT,
  EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
  TERMINATE_READY_ROOM_SCRIPT,
} from "#src/messaging/ready-room/ready-room-redis-scripts";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { ReadyRoomData } from "./party-ready-room.handlers.js";
import { makeReadyRoomDataLayer } from "./ready-room.data-layer.js";
import type { ReadyRoomRedis } from "./ready-room.repository.js";

it("expires only the disconnected character's existing gathering or application and tolerates repeated offline delivery", async () => {
  const boundary = await createDatabaseBoundary();
  const disconnectedAt = Date.parse("2026-09-10T10:00:00Z");
  const createdAt = new Date(disconnectedAt - 60_000).toISOString();
  const newerAt = new Date(disconnectedAt + 1).toISOString();
  const character = {
    accountId: "account",
    characterId: "character",
    nick: "Organizer",
    lvl: 100,
    prof: "w",
    icon: "icon",
  };
  const base: ReadyRoomAggregate = {
    schemaVersion: 3,
    notificationId: "owned",
    organizerDiscordId: "owner",
    organizerCharacter: character,
    guildIds: ["organization"],
    world: "experimental",
    status: "ACTIVE",
    revision: 1,
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(disconnectedAt + 600_000).toISOString(),
    participants: {},
  };
  const applicant = {
    participantId: "application",
    discordId: "owner",
    character,
    partyPresence: "OUTSIDE" as const,
    createdAt,
    updatedAt: createdAt,
  };
  const rooms: ReadyRoomAggregate[] = [
    base,
    { ...base, notificationId: "wrong-world", world: "other" },
    { ...base, notificationId: "wrong-organization", guildIds: ["other"] },
    {
      ...base,
      notificationId: "wrong-character",
      organizerCharacter: { ...character, characterId: "other" },
    },
    { ...base, notificationId: "wrong-user", organizerDiscordId: "other" },
    { ...base, notificationId: "newer-room", createdAt: newerAt },
    {
      ...base,
      notificationId: "application",
      organizerDiscordId: "other",
      participants: {
        application: applicant,
        alternate: {
          ...applicant,
          participantId: "alternate",
          character: { ...character, characterId: "alternate" },
        },
        newer: { ...applicant, participantId: "newer", createdAt: newerAt },
        stranger: {
          ...applicant,
          participantId: "stranger",
          discordId: "stranger",
        },
      },
    },
  ];
  const untouched = structuredClone(rooms.slice(1, -1));
  rooms.push({
    ...base,
    notificationId: "rejoined-during-cleanup",
    organizerDiscordId: "other",
    participants: { application: applicant },
  });
  let conflictDelivered = false;
  const cancellations: unknown[] = [];
  const updates: unknown[] = [];
  const redis: ReadyRoomRedis = {
    getJson: (key, schema) => {
      const room = rooms.find((candidate) =>
        key.endsWith(`:${candidate.notificationId}`),
      );
      return room
        ? Schema.decodeUnknownEffect(schema)(room)
        : Effect.succeed(null);
    },
    eval: (script, _keys, args) => {
      if (
        [
          TERMINATE_READY_ROOM_SCRIPT,
          COMMIT_READY_ROOM_SCRIPT,
          EXIT_READY_ROOM_PARTICIPANT_SCRIPT,
        ].includes(script)
      ) {
        const next = Schema.decodeUnknownSync(
          Schema.fromJsonString(PartyReadyRoomAggregateSchema),
        )(String(args[1]));
        const index = rooms.findIndex(
          (room) => room.notificationId === next.notificationId,
        );
        if (
          next.notificationId === "rejoined-during-cleanup" &&
          !conflictDelivered
        ) {
          conflictDelivered = true;
          rooms[index] = {
            ...next,
            participants: { application: { ...applicant, createdAt: newerAt } },
          };
          return Effect.succeed(["CONFLICT"]);
        }
        rooms[index] = next;
        return Effect.succeed(["COMMITTED"]);
      }
      return Effect.succeed(rooms.map((room) => room.notificationId));
    },
  };
  const layer = makeReadyRoomDataLayer(
    redis,
    {
      publish: (update) =>
        Effect.sync(() => {
          updates.push(update);
        }),
      publishCancellation: (event) =>
        Effect.sync(() => {
          cancellations.push(event);
        }),
      publishGathering: () => Effect.void,
      endPartyGatheringMessages: () => Effect.void,
    },
    () => disconnectedAt + 10_000,
  ).pipe(Layer.provide(Layer.succeed(ApiDatabase, boundary.database)));
  const offline = Effect.flatMap(ReadyRoomData, (data) =>
    data.characterOffline(
      decodeRabbitEventJson(
        RabbitRoutingKey.GAME_CHARACTER_OFFLINE,
        JSON.stringify({
          userId: "user",
          discordId: "owner",
          world: "experimental",
          characterId: "character",
          organizationIds: ["organization"],
          disconnectedAt,
        }),
      ),
    ),
  ).pipe(Effect.provide(layer));
  try {
    await Effect.runPromise(offline);
    expect(rooms[0]).toMatchObject({ status: "CANCELLED", revision: 2 });
    expect(cancellations).toEqual([
      { notificationId: "owned", guildId: "organization" },
    ]);
    expect(rooms.slice(1, -2)).toEqual(untouched);
    expect(rooms.at(-2)).toMatchObject({ status: "ACTIVE", revision: 2 });
    expect(Object.keys(rooms.at(-2)?.participants ?? {})).toEqual([
      "alternate",
      "newer",
      "stranger",
    ]);
    expect(conflictDelivered).toBe(true);
    expect(rooms.at(-1)).toMatchObject({
      status: "ACTIVE",
      revision: 2,
      participants: { application: { createdAt: newerAt } },
    });
    const afterFirstDelivery = structuredClone(rooms);
    const deliveredUpdates = updates.length;
    await Effect.runPromise(offline);
    expect(rooms).toEqual(afterFirstDelivery);
    expect(cancellations).toHaveLength(1);
    expect(updates).toHaveLength(deliveredUpdates);
  } finally {
    await boundary.dispose();
  }
});
