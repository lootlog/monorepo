import { expect, it } from "bun:test";
import { Effect } from "effect";
import { SYNC_BATTLE_WARRIOR_FILTERS_SQL } from "../../../test/battle-fixtures.js";
import { createBattleId } from "#src/battles/battle-id";
import { InvalidRequestError } from "@lootlog/protocol/http/errors";
import {
  integration,
  useBattleRedisIntegration,
} from "./battle-creation-redis.integration.fixtures.js";

useBattleRedisIntegration();

it("aggregates battle summaries in SQL without losing flee PH, level filters or user isolation", async () => {
  await integration.pool.query(
    `INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('uc', 'owner', 'hero', 'Hero', 'world')`,
  );

  const fixtures = [
    { id: "win", winningTeam: 1, losingTeam: 2, ph: 50 },
    { id: "loss", winningTeam: 2, losingTeam: 1, ph: 10 },
    { id: "flee", winningTeam: 2, losingTeam: 1, ph: 5, hasFlee: true },
    { id: "draw", winningTeam: 0, losingTeam: 0, ph: 20 },
    { id: "low", winningTeam: 1, losingTeam: 2, ph: 99, lvl: 10 },
    {
      id: "other",
      winningTeam: 1,
      losingTeam: 2,
      ph: 99,
      owner: "someone-else",
    },
    { id: "team", winningTeam: 1, losingTeam: 2, ph: 99, type: "team" },
  ];

  for (const fixture of fixtures) {
    const { id } = createBattleId(Date.now());

    await integration.pool.query(
      `INSERT INTO battles (id, "createdAt", "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", "hasFlee")
      VALUES ($1,battle_id_created_at($1),$2,'account','hero','world',10,$3,'Hero','Enemy',$4,$5,$6)`,
      [
        id,
        fixture.owner ?? "owner",
        fixture.type ?? "1v1",
        fixture.winningTeam,
        fixture.losingTeam,
        fixture.hasFlee ?? false,
      ],
    );
    await integration.pool.query(
      `INSERT INTO battle_warriors ("battleId","originalId",name,lvl,prof,icon,team,turns,ph)
      VALUES ($1,'hero','Hero',100,'w','hero.gif',1,1,$2), ($1,'enemy','Enemy',$3,'m','enemy.gif',2,1,0)`,
      [id, fixture.ph, fixture.lvl ?? 100],
    );
  }

  await integration.pool.query(SYNC_BATTLE_WARRIOR_FILTERS_SQL);

  const filters = { characterId: "hero", minLevel: 80, maxLevel: 120 };
  expect(
    await integration.runtime.runPromise(
      integration.services.analytics.getBattleAnalytics(filters, "owner"),
    ),
  ).toEqual({
    wins: 1,
    losses: 1,
    totalBattles: 2,
    totalPH: 85,
    winRatio: 50,
  });
  expect(
    await integration.runtime.runPromise(
      integration.services.analytics.calculateProfessionWinRate(
        {
          ...filters,
          size: 20,
          sortBy: "totalBattles",
          sortOrder: "desc",
          includeTotal: false,
        },
        "owner",
      ),
    ),
  ).toEqual([{ prof: "m", wins: 1, losses: 1, totalBattles: 2, winRate: 50 }]);
  expect(
    await integration.runtime.runPromise(
      integration.services.analytics.getBattleAnalytics(
        { ...filters, matchmaking: true },
        "owner",
      ),
    ),
  ).toEqual({
    wins: 0,
    losses: 0,
    totalBattles: 0,
    totalPH: 0,
    winRatio: 0,
  });
});

it("reports character metadata from the latest matching self warrior per owner and world", async () => {
  await integration.pool.query(
    `INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('uc-level', 'owner', 'hero', 'Hero', 'world'), ('uc-world', 'owner', 'hero', 'Other Hero', 'other-world'), ('uc-empty', 'owner', 'empty', 'Empty', 'world'), ('uc-foreign', 'someone-else', 'foreign', 'Foreign', 'private-world')`,
  );

  const fixtures = [
    { id: "older", owner: "owner", createdAt: "2026-01-01", lvl: 90 },
    { id: "latest", owner: "owner", createdAt: "2026-02-01", lvl: 101 },
    { id: "foreign", owner: "someone-else", createdAt: "2026-03-01", lvl: 200 },
    {
      id: "other-world",
      owner: "owner",
      createdAt: "2026-04-01",
      lvl: 150,
      world: "other-world",
    },
    {
      id: "missing-self",
      owner: "owner",
      createdAt: "2026-05-01",
      lvl: 999,
      missingSelf: true,
    },
  ];

  for (const fixture of fixtures) {
    const { id } = createBattleId(Date.parse(fixture.createdAt));

    await integration.pool.query(
      `INSERT INTO battles (id, "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", "hasFlee", "createdAt")
      VALUES ($1,$2,'account','hero',$3,10,'1v1','Hero','Enemy',1,2,false,battle_id_created_at($1))`,
      [id, fixture.owner, fixture.world ?? "world"],
    );
    await integration.pool.query(
      `INSERT INTO battle_warriors ("battleId","originalId",name,lvl,prof,icon,team,turns,ph)
      VALUES ($1,$3,'Hero',$2,'w','hero.gif',1,1,0), ($1,'enemy','Enemy',300,'m','enemy.gif',2,1,0)`,
      [id, fixture.lvl, fixture.missingSelf ? "unrelated" : "hero"],
    );
  }

  await integration.pool.query(SYNC_BATTLE_WARRIOR_FILTERS_SQL);

  const { characters } = await integration.runtime.runPromise(
    integration.services.metadata.getUserCharacters("owner"),
  );

  expect([...characters].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
    {
      id: "empty",
      name: "Empty",
      world: "world",
      icon: "",
      lvl: null,
      prof: null,
    },
    { id: "hero", name: "Hero", world: "world", icon: "", lvl: 101, prof: "w" },
    {
      id: "hero",
      name: "Other Hero",
      world: "other-world",
      icon: "",
      lvl: 150,
      prof: "w",
    },
  ]);
});

it("searches only owned warriors with trimmed ILIKE and preserves distinct names from their latest battle", async () => {
  const latest = createBattleId(Date.parse("2026-02-01")).id;
  const earlier = createBattleId(Date.parse("2026-01-01")).id;
  const foreign = createBattleId(Date.parse("2026-03-01")).id;

  await integration.pool
    .query(`INSERT INTO battles (id,"userId","accountId","characterId",world,duration,type,winner,loser,"winningTeam","losingTeam","createdAt")
    SELECT id, owner,'account','hero','world',10,'1v1','Hero','Enemy',1,2,battle_id_created_at(id)
    FROM (VALUES ('${latest}'::uuid,'owner'), ('${earlier}'::uuid,'owner'), ('${foreign}'::uuid,'someone-else')) AS seed(id, owner)`);
  await integration.pool
    .query(`INSERT INTO battle_warriors ("battleId","originalId",name,lvl,prof,icon,team,turns,ph) VALUES
    ('${latest}','9','Alpha',90,'w','latest.gif',1,1,0),
    ('${earlier}','10','Alpha',100,'m','earlier.gif',1,1,0),
    ('${earlier}','11','alpha',110,'p','case.gif',1,1,0),
    ('${foreign}','9','Alpha',999,'m','private.gif',1,1,0),
    ('${foreign}','12','Alpine',999,'m','private.gif',1,1,0)`);
  await integration.pool.query(SYNC_BATTLE_WARRIOR_FILTERS_SQL);

  const expected = [
    { name: "Alpha", lvl: 90, prof: "w", icon: "latest.gif" },
    { name: "alpha", lvl: 110, prof: "p", icon: "case.gif" },
  ];

  expect(
    await integration.runtime.runPromise(
      integration.services.metadata.searchWarriors("  aLp  ", "owner"),
    ),
  ).toEqual({ warriors: expected });
  expect(
    await integration.runtime.runPromise(
      integration.services.metadata.searchWarriors("Al_ha", "owner"),
    ),
  ).toEqual({ warriors: expected });
  expect(
    await integration.runtime.runPromise(
      integration.services.metadata.searchWarriors("Al%ha", "owner"),
    ),
  ).toEqual({ warriors: expected });
  expect(
    await integration.runtime.runPromise(
      integration.services.metadata.searchWarriors(" a ", "owner"),
    ),
  ).toEqual({ warriors: [] });

  await integration.pool
    .query(`INSERT INTO battle_warriors ("battleId","originalId",name,lvl,prof,icon,team,turns,ph)
    SELECT '${earlier}'::uuid, 'ordered-' || n, 'Ordered ' || lpad(n::text,2,'0'), 100, 'w', 'hero.gif', 1, 1, 0
    FROM generate_series(12,1,-1) n`);
  await integration.pool.query(SYNC_BATTLE_WARRIOR_FILTERS_SQL);

  const ordered = await integration.runtime.runPromise(
    integration.services.metadata.searchWarriors("Ordered", "owner"),
  );

  expect(ordered.warriors.map((warrior) => warrior.name)).toEqual([
    "Ordered 01",
    "Ordered 02",
    "Ordered 03",
    "Ordered 04",
    "Ordered 05",
    "Ordered 06",
    "Ordered 07",
    "Ordered 08",
    "Ordered 09",
    "Ordered 10",
  ]);
});

it("applies combined dashboard filters and counts only the requesting owner's matching battles", async () => {
  await integration.pool.query(
    `INSERT INTO user_characters (id,"userId","characterId",name,world) VALUES ('dashboard-hero','owner','hero','Hero','world')`,
  );

  const fixtures = [
    { id: "match-a" },
    { id: "match-b" },
    { id: "foreign", owner: "someone-else" },
    { id: "loss", winningTeam: 2 },
    { id: "flee", hasFlee: true },
    { id: "low", lvl: 79 },
    { id: "high", lvl: 121 },
    { id: "other-name", name: "Other" },
  ];

  const ids = new Map<string, string>();

  for (const fixture of fixtures) {
    const { id } = createBattleId(Date.parse("2026-01-01"));
    ids.set(fixture.id, id);

    await integration.pool.query(
      `INSERT INTO battles (id,"userId","accountId","characterId",world,duration,type,winner,loser,"winningTeam","losingTeam","hasFlee","createdAt")
      VALUES ($1,$2,'account','hero','world',10,'1v1','Hero','Enemy',$3,$4,$5,battle_id_created_at($1))`,
      [
        id,
        fixture.owner ?? "owner",
        fixture.winningTeam ?? 1,
        fixture.winningTeam === 2 ? 1 : 2,
        fixture.hasFlee ?? false,
      ],
    );
    await integration.pool.query(
      `INSERT INTO battle_warriors ("battleId","originalId",name,lvl,prof,icon,team,turns,ph)
      VALUES ($1,'hero','Hero',100,'w','hero.gif',1,1,0), ($1,'enemy',$2,$3,'m','enemy.gif',2,1,0)`,
      [id, fixture.name ?? "Enemy", fixture.lvl ?? 100],
    );
  }

  await integration.pool.query(SYNC_BATTLE_WARRIOR_FILTERS_SQL);

  const result = await integration.runtime.runPromise(
    integration.services.battles.getDashboardBattles(
      {
        result: ["won"],
        minLevel: 80,
        maxLevel: 120,
        search: "eNeM",
        size: 1,
        sortOrder: "asc",
        includeTotal: true,
        userId: "someone-else",
      },
      "owner",
    ),
  );

  expect(result.battles.map((battle) => battle.id)).toEqual([
    ids.get("match-a")!,
  ]);
  expect(result.pagination.total).toBe(2);
  expect(result.pagination.hasNext).toBe(true);

  const previousFormatCursor = `2026-01-01T00:00:00.000Z_${ids.get("match-a")}`;

  expect(
    await integration.runtime.runPromise(
      Effect.flip(
        integration.services.battles.getDashboardBattles(
          {
            cursor: previousFormatCursor,
            size: 1,
            sortOrder: "asc",
            includeTotal: false,
          },
          "owner",
        ),
      ),
    ),
  ).toBeInstanceOf(InvalidRequestError);
});
