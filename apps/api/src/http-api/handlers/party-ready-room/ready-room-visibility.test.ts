import { afterEach, expect, it } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { readyRoomSourceVisibility } from "./ready-room-visibility.js";

let dispose = async () => {};

afterEach(async () => dispose());

it("filters Organization, NPC tier, and level boundaries before exposing a gathering", async () => {
  const boundary = await createDatabaseBoundary();
  dispose = () => boundary.dispose();
  const database = boundary.database;
  await boundary.run(
    database
      .insert(guildTable)
      .values(createGuildFixture({ id: "org", ownerId: "owner" })),
  );
  await boundary.run(
    database.insert(memberTable).values(
      createMemberFixture({
        id: 1,
        guildId: "org",
        userId: "member",
        globalUserId: "user",
      }),
    ),
  );
  await boundary.run(
    database.insert(roleTable).values({
      id: "role",
      guildId: "org",
      name: "role",
      updatedAt: new Date(),
      permissions: [
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_CHAT_HEROES_READ,
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
      ],
      lvlRangeFrom: 100,
      lvlRangeTo: 200,
    }),
  );
  await boundary.run(
    database.insert(memberToRoleTable).values({ A: 1, B: "role" }),
  );

  const visible = await boundary.run(
    readyRoomSourceVisibility(database, "member", ["org"]),
  );

  const room: ReadyRoomAggregate = {
    schemaVersion: 3,
    notificationId: "room",
    organizerDiscordId: "owner",
    organizerCharacter: {
      accountId: "1",
      characterId: "2",
      nick: "hero",
      lvl: 100,
      prof: "w",
      icon: "icon",
    },
    guildIds: ["org", "hidden"],
    world: "Test",
    status: "ACTIVE",
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    participants: {},
    npc: { name: "NPC", location: "map", lvl: 150, type: "HERO" },
  };

  expect(visible(room)).toEqual(["org"]);
  expect(
    visible({
      ...room,
      npc: { ...room.npc, name: "NPC", location: "map", lvl: 99, type: "HERO" },
    }),
  ).toEqual([]);
  expect(
    visible({
      ...room,
      npc: { name: "NPC", location: "map", lvl: 150, type: "TITAN" },
    }),
  ).toEqual([]);
  expect(
    visible({
      ...room,
      organizerDiscordId: "member",
      npc: { name: "NPC", location: "map", lvl: 0, type: "TITAN" },
    }),
  ).toEqual(["org"]);
  expect(
    await boundary.run(
      readyRoomSourceVisibility(database, "outsider", ["org"]).pipe(
        Effect.map((check) => check(room)),
      ),
    ),
  ).toEqual([]);
});
