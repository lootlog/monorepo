import { expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import {
  canReadHeroSighting,
  canReadNpcFeatureSource,
  type RolePermissionData,
} from "@lootlog/domain/npc-permissions";
import { Capability } from "@lootlog/schema/permissions";

const ROLES = {
  timers: { permissions: [Capability.LOOTLOG_TIMERS_READ], range: [0, 500] },
  heroTimers: {
    permissions: [Capability.LOOTLOG_TIMERS_HEROES_READ],
    range: [100, 200],
  },
  heroWriters: {
    permissions: [
      Capability.LOOTLOG_TIMERS_READ,
      Capability.LOOTLOG_TIMERS_HEROES_READ,
      Capability.LOOTLOG_TIMERS_WRITE,
    ],
    range: [0, 300],
  },
  chat: { permissions: [Capability.LOOTLOG_CHAT_READ], range: [0, 500] },
} as const;

const MEMBERS: ReadonlyArray<ReadonlyArray<keyof typeof ROLES>> = [
  ["timers", "heroTimers"],
  ["heroWriters"],
  ["timers"],
  ["chat"],
];

const readsSightingThroughTimers = (
  roles: readonly RolePermissionData[],
  heroLvl: number,
) =>
  canReadNpcFeatureSource(roles, "timers", {
    tier: "heroes",
    npcLevel: heroLvl,
  });

it("keeps every role's hero sighting access when sightings get their own capabilities", async () => {
  const database = new PGlite({ extensions: { pg_trgm } });

  try {
    const migrations = readMigrationFiles({
      migrationsFolder: fileURLToPath(
        new URL("../../../drizzle/migrations", import.meta.url),
      ),
    });

    const grantIndex = migrations.findIndex((migration) =>
      migration.sql.some(
        (statement) =>
          statement.includes('UPDATE "Role"') &&
          statement.includes(Capability.LOOTLOG_HERO_SIGHTINGS_READ),
      ),
    );

    if (grantIndex < 0) throw new Error("Hero sighting grant is missing");

    for (const migration of migrations.slice(0, grantIndex))
      await database.exec(migration.sql.join("\n"));

    await database.exec(
      `INSERT INTO "Guild" (id, name, "ownerId", "updatedAt") VALUES ('guild', 'Guild', 'owner', now())`,
    );

    for (const [id, { permissions, range }] of Object.entries(ROLES)) {
      const [from, to] = range;
      await database.query(
        `INSERT INTO "Role" (id, "guildId", name, permissions, "lvlRangeFrom", "lvlRangeTo", "updatedAt")
         VALUES ($1, 'guild', $1, $2::"Permission"[], $3, $4, now())`,
        [id, `{${permissions.join(",")}}`, from, to],
      );
    }

    const readRoles = async () =>
      new Map(
        (
          await database.query<{
            id: string;
            permissions: string;
            lvlRangeFrom: number;
            lvlRangeTo: number;
          }>(
            `SELECT id, permissions::text[]::text AS permissions, "lvlRangeFrom", "lvlRangeTo" FROM "Role"`,
          )
        ).rows.map((row) => [
          row.id,
          {
            permissions: row.permissions
              .slice(1, -1)
              .split(",")
              .filter(Boolean),
            lvlRangeFrom: row.lvlRangeFrom,
            lvlRangeTo: row.lvlRangeTo,
          },
        ]),
      );

    const before = await readRoles();
    await database.exec(migrations[grantIndex]!.sql.join("\n"));
    const after = await readRoles();

    const memberRoles = (
      roles: ReadonlyMap<string, RolePermissionData>,
      member: ReadonlyArray<string>,
    ) => member.flatMap((id) => roles.get(id) ?? []);

    for (const member of MEMBERS) {
      for (const heroLvl of [150, 250]) {
        expect({
          member,
          heroLvl,
          read: canReadHeroSighting(memberRoles(after, member), heroLvl),
        }).toEqual({
          member,
          heroLvl,
          read: readsSightingThroughTimers(
            memberRoles(before, member),
            heroLvl,
          ),
        });
      }
    }

    const writers = [...after].flatMap(([id, role]) =>
      role.permissions.includes(Capability.LOOTLOG_HERO_SIGHTINGS_WRITE)
        ? [id]
        : [],
    );

    expect(writers).toEqual(["heroWriters"]);
  } finally {
    await database.close();
  }
});
