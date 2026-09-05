import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
  decodeRabbitEventJson,
  GuildCreated,
  GuildUpdated,
} from "@lootlog/protocol/rabbit/events";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { eq, sql } from "drizzle-orm";
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
const decodeCreated = (payload: unknown) =>
  Schema.decodeUnknownSync(GuildCreated)(
    decodeRabbitEventJson(
      RabbitRoutingKey.GUILDS_CREATE,
      JSON.stringify(payload),
    ),
  );
const decodeUpdated = (payload: unknown) =>
  Schema.decodeUnknownSync(GuildUpdated)(
    decodeRabbitEventJson(
      RabbitRoutingKey.GUILDS_UPDATE,
      JSON.stringify(payload),
    ),
  );

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
});
