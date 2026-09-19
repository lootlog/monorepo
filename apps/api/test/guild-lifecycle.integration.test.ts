import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
  decodeRabbitEventJson,
  GuildCreated,
  GuildRoleChanged,
  GuildUpdated,
} from "@lootlog/protocol/rabbit/events";
import { Permission } from "@lootlog/schema/permissions";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { and, eq, sql } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import { guildTable, roleTable } from "../src/database/drizzle/schema.js";
import { makeGuildLifecycle } from "../src/guilds/guild-lifecycle.operations.js";
import {
  getGuildCacheKey,
  getPermissionsCachePattern,
} from "../src/shared/cache.js";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

const guildId = "guild-lifecycle-test";

const decodeCreated = (payload: typeof GuildCreated.Encoded) =>
  Schema.decodeUnknownSync(GuildCreated)(
    decodeRabbitEventJson(
      RabbitRoutingKey.GUILDS_CREATE,
      JSON.stringify(payload),
    ),
  );

const decodeUpdated = (payload: typeof GuildUpdated.Encoded) =>
  Schema.decodeUnknownSync(GuildUpdated)(
    decodeRabbitEventJson(
      RabbitRoutingKey.GUILDS_UPDATE,
      JSON.stringify(payload),
    ),
  );

const decodeRoleUpdated = (payload: typeof GuildRoleChanged.Encoded) =>
  Schema.decodeUnknownSync(GuildRoleChanged)(
    decodeRabbitEventJson(
      RabbitRoutingKey.GUILDS_UPDATE_ROLE,
      JSON.stringify(payload),
    ),
  );

const roleId = "role";

const lootlogGranted = [
  Permission.LOOTLOG_ACCESS,
  Permission.LOOTLOG_TIMERS_READ,
];

/**
 * Creates the Organization with one role that has no Discord Administrator,
 * then stores `permissions` on it the way an owner's role edit does.
 */
const setupRole = Effect.fn("setupRole")(function* (
  permissions: ReadonlyArray<Permission>,
  clearedPatterns: string[] = [],
) {
  const db = yield* ApiDatabase;

  const lifecycle = makeGuildLifecycle(db, {
    clearCacheKey: () => Effect.void,
    clearCachePattern: (pattern) =>
      Effect.sync(() => clearedPatterns.push(pattern)),
    notifyMembersRemoved: () => Effect.void,
  });

  const created = decodeCreated({
    guildId,
    name: "lootlog-test",
    icon: null,
    ownerId: "owner",
    roles: [{ id: roleId, name: "Role", color: 0, position: 1, admin: false }],
  });

  yield* lifecycle.createGuild(created);
  yield* db
    .update(roleTable)
    .set({ permissions: [...permissions] })
    .where(eq(roleTable.id, roleId));

  const readRole = db
    .select()
    .from(roleTable)
    .where(and(eq(roleTable.id, roleId), eq(roleTable.guildId, guildId)))
    .pipe(Effect.map((rows) => rows[0]));

  const forgetDiscordAdmin = db
    .update(roleTable)
    .set({ discordAdmin: null })
    .where(eq(roleTable.id, roleId));

  return { lifecycle, created, readRole, forgetDiscordAdmin };
});

const roleUpdate = (changes: Partial<typeof GuildRoleChanged.Encoded>) =>
  decodeRoleUpdated({
    guildId,
    id: roleId,
    name: "Role",
    color: 0,
    position: 1,
    admin: false,
    ...changes,
  });

describe("Discord guild lifecycle against migrated PostgreSQL", () => {
  beforeEach(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        yield* db.execute(sql`TRUNCATE TABLE "Guild" RESTART IDENTITY CASCADE`);
      }),
    ),
  );
  afterAll(() => runtime.dispose());

  it("persists creation, renaming, icon addition and removal without affecting another organization", async () => {
    const clearedKeys: string[] = [];
    const clearedPatterns: string[] = [];
    await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;

        const lifecycle = makeGuildLifecycle(db, {
          clearCacheKey: (key) => Effect.sync(() => clearedKeys.push(key)),
          clearCachePattern: (pattern) =>
            Effect.sync(() => clearedPatterns.push(pattern)),
          notifyMembersRemoved: () => Effect.void,
        });

        const created = decodeCreated({
          guildId,
          name: "lootlog-test",
          icon: null,
          ownerId: "original-owner",
          roles: [
            { id: "role", name: "Role", color: 0, position: 0, admin: false },
          ],
        });

        yield* lifecycle.createGuild(created);
        yield* lifecycle.createGuild(created);
        yield* lifecycle.createGuild(
          decodeCreated({
            ...created,
            guildId: "other-organization",
            name: "Other",
            icon: "other-icon",
            roles: [],
          }),
        );
        yield* db
          .update(guildTable)
          .set({ vanityUrl: "guild-alias" })
          .where(eq(guildTable.id, guildId));

        const [initial] = yield* db
          .select()
          .from(guildTable)
          .where(eq(guildTable.id, guildId));

        expect(initial).toMatchObject({
          name: "lootlog-test",
          icon: null,
          active: true,
        });
        expect(
          yield* db
            .select()
            .from(roleTable)
            .where(eq(roleTable.guildId, guildId)),
        ).toHaveLength(1);

        for (const changes of [
          { name: "testowankox", icon: null, ownerId: "original-owner" },
          {
            name: "testowankox",
            icon: "a_icon-hash",
            ownerId: "original-owner",
          },
          { name: "testowankox", icon: null, ownerId: "new-owner" },
        ]) {
          const updated = decodeUpdated({ guildId, ...changes });
          yield* lifecycle.updateGuild(updated);
          yield* lifecycle.updateGuild(updated);

          const rows = yield* db
            .select()
            .from(guildTable)
            .where(eq(guildTable.id, guildId));

          expect(rows).toHaveLength(1);
          expect(rows[0]).toMatchObject(changes);
        }

        const [other] = yield* db
          .select()
          .from(guildTable)
          .where(eq(guildTable.id, "other-organization"));

        expect(other).toMatchObject({
          name: "Other",
          icon: "other-icon",
          ownerId: "original-owner",
        });
      }),
    );
    expect(clearedKeys).toHaveLength(12);
    expect(new Set(clearedKeys)).toEqual(
      new Set([getGuildCacheKey(guildId), getGuildCacheKey("guild-alias")]),
    );
    expect(clearedPatterns).toEqual(
      Array.from({ length: 6 }, () => getPermissionsCachePattern(guildId)),
    );
  });

  it("keeps a Lootlog-granted ADMIN and its other permissions through Discord rename, colour and position updates", async () => {
    const granted = [Permission.ADMIN, ...lootlogGranted];
    const clearedPatterns: string[] = [];
    await runtime.runPromise(
      Effect.gen(function* () {
        const role = yield* setupRole(granted, clearedPatterns);

        const updates = [
          roleUpdate({ name: "Renamed" }),
          roleUpdate({ name: "Renamed", color: 0xff0000 }),
          // Reordering other roles shifts this one. Current bots report the
          // previous flag on updates; events from older bots lack it.
          roleUpdate({
            name: "Renamed",
            color: 0xff0000,
            position: 7,
            previousAdmin: false,
          }),
        ];

        for (const update of updates) {
          yield* role.lifecycle.upsertRole(update);
          yield* role.lifecycle.upsertRole(update);

          expect(yield* role.readRole).toMatchObject({
            name: update.name,
            color: update.color,
            position: update.position,
            permissions: granted,
          });
        }

        // Another Organization's event must not reach this role.
        yield* role.lifecycle.createGuild({
          ...role.created,
          guildId: "other-organization",
          roles: [],
        });
        yield* role.lifecycle.upsertRole({
          ...roleUpdate({ name: "Hijacked", admin: true }),
          guildId: "other-organization",
        });

        expect(yield* role.readRole).toMatchObject({
          name: "Renamed",
          permissions: granted,
        });
      }),
    );
    expect(clearedPatterns).toContain(getPermissionsCachePattern(guildId));
  });

  it("adds only ADMIN when a role gains Discord Administrator and removes only ADMIN when it loses it", async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const role = yield* setupRole(lootlogGranted);

        const gained = roleUpdate({ admin: true, previousAdmin: false });
        yield* role.lifecycle.upsertRole(gained);
        yield* role.lifecycle.upsertRole(gained);

        expect((yield* role.readRole)?.permissions).toEqual([
          ...lootlogGranted,
          Permission.ADMIN,
        ]);

        const lost = roleUpdate({ admin: false, previousAdmin: true });
        yield* role.lifecycle.upsertRole(lost);
        yield* role.lifecycle.upsertRole(lost);

        expect((yield* role.readRole)?.permissions).toEqual(lootlogGranted);
      }),
    );
  });

  it("does not derive a permission change for a role stored before the Discord Administrator flag was recorded", async () => {
    const granted = [Permission.ADMIN, ...lootlogGranted];
    await runtime.runPromise(
      Effect.gen(function* () {
        const role = yield* setupRole(granted);

        // Without a previous flag the first event only records the flag.
        yield* role.forgetDiscordAdmin;
        yield* role.lifecycle.upsertRole(roleUpdate({ admin: false }));

        expect(yield* role.readRole).toMatchObject({
          permissions: granted,
          discordAdmin: false,
        });

        // A repeated guild creation records the flag and leaves the policy.
        yield* role.forgetDiscordAdmin;
        yield* role.lifecycle.createGuild(role.created);

        expect(yield* role.readRole).toMatchObject({
          permissions: granted,
          discordAdmin: false,
        });

        // The reported previous flag stands in for the missing one, so a role
        // that really loses Discord Administrator on its first event loses
        // ADMIN and nothing else.
        yield* role.forgetDiscordAdmin;
        yield* role.lifecycle.upsertRole(
          roleUpdate({ admin: false, previousAdmin: true }),
        );

        expect((yield* role.readRole)?.permissions).toEqual(lootlogGranted);
      }),
    );
  });
});
