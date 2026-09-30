import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import type { Role } from "#src/timers/timers.types";
import { makeTimerSearch } from "./timer-search.data-layer.js";
import type { TimersGuildAccess } from "./timers.handlers.js";

const guild = createGuildFixture({ id: "organization" });

const role = (
  permissions: Permission[],
  lvlRangeFrom = 0,
  lvlRangeTo = 500,
): Role => ({
  id: `role-${permissions.join("-")}-${lvlRangeFrom}-${lvlRangeTo}`,
  guildId: guild.id,
  name: "Role",
  permissions,
  lvlRangeFrom,
  lvlRangeTo,
  color: null,
  position: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const accessWith = (roles: Role[]): TimersGuildAccess => ({
  guild,
  userId: "user",
  discordId: "discord",
  roles,
  accessPolicy: createAccessPolicy({
    capabilities: roles.flatMap((entry) => entry.permissions),
  }),
});

const timer = (
  guildId: string,
  world: string,
  npcId: number,
  npc: {
    readonly name: string;
    readonly lvl: number;
    readonly type: string;
    readonly location?: string;
    readonly templateId?: number;
    readonly margonemType?: number;
  },
  deletedAt: Date | null = null,
) => ({
  guildId,
  world,
  npcId,
  timerKey: `${npcId}:${npc.name}`,
  createdById: 1,
  npc: { id: npcId, margonemType: 1, ...npc },
  minSpawnTime: new Date(),
  maxSpawnTime: new Date(Date.now() + 60_000),
  latestRespBaseSeconds: 3600,
  latestRespawnRandomness: 10,
  deletedAt,
  updatedAt: new Date(),
});

describe("timer NPC search", () => {
  let boundary: Awaited<ReturnType<typeof createDatabaseBoundary>>;

  const search = (
    roles: Role[],
    query: Parameters<ReturnType<typeof makeTimerSearch>>[1],
  ) =>
    boundary.run(makeTimerSearch(boundary.database)(accessWith(roles), query));

  beforeAll(async () => {
    boundary = await createDatabaseBoundary();
    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values([guild, createGuildFixture({ id: "other-organization" })]),
    );
    await boundary.run(
      boundary.database
        .insert(memberTable)
        .values(createMemberFixture({ guildId: guild.id })),
    );
    await boundary.run(
      boundary.database.insert(timerTable).values([
        // Sorts before the visible elite, so a leak would take the limit.
        timer(guild.id, "world-a", 100, {
          name: "Kic hero",
          lvl: 300,
          type: "HERO",
          location: "Hidden cave",
          templateId: 900,
        }),
        timer(guild.id, "world-a", 200, {
          name: "Kic elite",
          lvl: 50,
          type: "ELITE2",
          templateId: 901,
        }),
        timer(guild.id, "world-a", 250, {
          name: "Kic without template",
          lvl: 50,
          type: "ELITE2",
        }),
        timer(guild.id, "world-b", 300, {
          name: "Kic elite",
          lvl: 50,
          type: "ELITE2",
          templateId: 901,
        }),
        timer(guild.id, "world-b", 400, {
          name: "Kic manual",
          lvl: 50,
          type: "ELITE2",
          margonemType: TIMER_TYPES.CUSTOM_MANUAL,
        }),
        timer(
          guild.id,
          "world-a",
          600,
          { name: "Kic deleted", lvl: 50, type: "ELITE2", templateId: 901 },
          new Date(),
        ),
        timer("other-organization", "world-a", 500, {
          name: "Kic elite",
          lvl: 50,
          type: "ELITE2",
          templateId: 901,
        }),
      ]),
    );
  });

  afterAll(async () => {
    await boundary.dispose();
  });

  it("hides timers outside the caller's NPC type capability and level range without consuming the limit", async () => {
    const baseReader = [role([Permission.LOOTLOG_TIMERS_READ], 0, 100)];

    const results = await search(baseReader, {
      world: "world-a",
      search: "kic",
      limit: 1,
    });

    expect(results).toEqual([
      expect.objectContaining({ npcId: 200, templateId: 901 }),
    ]);

    const outOfRange = await search(
      [
        role(
          [
            Permission.LOOTLOG_TIMERS_READ,
            Permission.LOOTLOG_TIMERS_HEROES_READ,
          ],
          0,
          100,
        ),
      ],
      { templateIds: [900] },
    );

    expect(outOfRange).toEqual([]);
  });

  it("keeps reading past a full batch of hidden timers to fill the limit", async () => {
    await boundary.run(
      boundary.database.insert(timerTable).values([
        ...Array.from({ length: 100 }, (_, index) =>
          timer(guild.id, "world-c", 1000 + index, {
            name: "Ogr hero",
            lvl: 300,
            type: "HERO",
          }),
        ),
        timer(guild.id, "world-c", 2000, {
          name: "Ogr elite",
          lvl: 50,
          type: "ELITE2",
        }),
      ]),
    );

    const results = await search(
      [role([Permission.LOOTLOG_TIMERS_READ], 0, 100)],
      { world: "world-c", search: "ogr", limit: 1 },
    );

    expect(results.map(({ npcId }) => npcId)).toEqual([2000]);
  });

  it("returns a hero's identity, location and respawn data to an authorized caller", async () => {
    const results = await search(
      [
        role([
          Permission.LOOTLOG_TIMERS_READ,
          Permission.LOOTLOG_TIMERS_HEROES_READ,
        ]),
      ],
      { world: "world-a", search: "kic", limit: 1 },
    );

    expect(results).toEqual([
      expect.objectContaining({
        npcId: 100,
        templateId: 900,
        world: "world-a",
        location: "Hidden cave",
        latestRespBaseSeconds: 3600,
      }),
    ]);
  });

  it("searches every Organization world by identity without manual, deleted or foreign timers", async () => {
    const admin = [role([Permission.ADMIN])];

    const byTemplate = await search(admin, { templateIds: [901] });

    expect(byTemplate.map(({ world, npcId }) => [world, npcId])).toEqual([
      ["world-a", 200],
      ["world-b", 300],
    ]);

    const byName = await search(admin, { search: "kic", limit: 50 });

    expect(byName.map(({ npcId }) => npcId)).toEqual([100, 200, 250, 300]);

    const byRuntimeId = await search(admin, {
      world: "world-b",
      npcIds: [200, 300],
    });

    expect(byRuntimeId.map(({ npcId }) => npcId)).toEqual([300]);
  });
});
