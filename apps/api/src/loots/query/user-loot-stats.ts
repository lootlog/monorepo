import { groupBy } from "es-toolkit";
import { DateTime, Effect } from "effect";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import {
  lootPlayerTable,
  playerSnapshotTable,
  userCharacterKillBucketTable,
  userCharactersLootlogSettingsTable,
  userKillBucketTable,
} from "#src/database/drizzle/schema";
import type {
  UserLootStatsQuery,
  UserLootStatsResponse,
} from "#src/contracts/loots/schemas";
import { getKillAnalyticsRange } from "#src/kills/user-kill-analytics-query";
import {
  buildUserCaughtItemsQueries,
  buildUserLootIdsQuery,
  buildUserLootStatsQueries,
  runLootStatsQuery,
} from "#src/loots/query/loot-stats-query";
import {
  readLootStatsOverview,
  readLootStatsRarityTimeline,
  readLootStatsTopNpcs,
} from "#src/loots/query/loot-stats.service";
import {
  buildUserLootRecordCondition,
  loadUserLootScopes,
  userLootScopeAccess,
} from "#src/loots/query/user-loot-scopes";

const empty: UserLootStatsResponse = {
  overview: {
    totalLoots: 0,
    totalItems: 0,
    legendaryItems: 0,
    heroicItems: 0,
    avgItemLevel: 0,
    caughtLegendaryItems: 0,
  },
  timeline: [],
  topNpcs: [],
  legends: [],
  monsters: [],
};

/** The bosses the monster list counts kills of, as the kill statistics track them. */
const BOSS_TYPES = ["TITAN", "COLOSSUS", "HERO", "ELITE3", "ELITE2"] as const;

type CaughtItem = { lootId: number; hid: string };

type UserCharacter = { world: string; accountId: string; characterId: string };

const characterKey = (character: UserCharacter) =>
  `${character.world}:${character.accountId}:${character.characterId}`;

/** A legend's catches per character of the user, on its world. */
const countCatches = (
  rows: readonly { world: string; caught_items: readonly CaughtItem[] }[],
  caughtCharacter:
    | ((caughtItem: CaughtItem) => Omit<UserCharacter, "world"> | undefined)
    | undefined,
) =>
  Object.values(
    groupBy(
      rows.flatMap((row) =>
        row.caught_items.flatMap((caughtItem) => {
          const character = caughtCharacter?.(caughtItem);

          return character ? [{ ...character, world: row.world }] : [];
        }),
      ),
      characterKey,
    ),
  ).flatMap((catches) => {
    const [character] = catches;

    return character ? [{ ...character, caught: catches.length }] : [];
  });

/**
 * Each character's name as the latest snapshot among the chosen loots calls
 * it, so a name seen only in loots the user cannot see stays hidden.
 */
const readCharacterNames = (
  database: typeof ApiDatabase.Service,
  lootIds: readonly number[],
  characters: readonly UserCharacter[],
) =>
  Effect.gen(function* () {
    if (!characters.length) return new Map<string, string>();

    const snapshots = yield* runLootStatsQuery(
      "loot-stats.user-caught-characters",
      database
        .selectDistinctOn(
          [
            playerSnapshotTable.world,
            playerSnapshotTable.accountId,
            playerSnapshotTable.characterId,
          ],
          {
            world: playerSnapshotTable.world,
            accountId: playerSnapshotTable.accountId,
            characterId: playerSnapshotTable.characterId,
            name: playerSnapshotTable.name,
          },
        )
        .from(lootPlayerTable)
        .innerJoin(
          playerSnapshotTable,
          eq(playerSnapshotTable.id, lootPlayerTable.playerSnapshotId),
        )
        .where(
          and(
            sql`${lootPlayerTable.lootId} = ANY(${sql.param(lootIds)}::int[])`,
            sql`(${playerSnapshotTable.world}, ${playerSnapshotTable.accountId}, ${playerSnapshotTable.characterId}) IN (SELECT * FROM unnest(${sql.param(characters.map((character) => character.world))}::text[], ${sql.param(characters.map((character) => character.accountId))}::int[], ${sql.param(characters.map((character) => character.characterId))}::int[]))`,
          ),
        )
        .orderBy(
          playerSnapshotTable.world,
          playerSnapshotTable.accountId,
          playerSnapshotTable.characterId,
          desc(playerSnapshotTable.createdAt),
        ),
    );

    return new Map(
      snapshots.map((snapshot) => [
        characterKey({
          world: snapshot.world,
          accountId: String(snapshot.accountId),
          characterId: String(snapshot.characterId),
        }),
        snapshot.name,
      ]),
    );
  });

export const makeUserLootStats = (database: typeof ApiDatabase.Service) =>
  Effect.fn("loots.user-stats")(function* (
    discordId: string,
    query: UserLootStatsQuery,
  ) {
    const days = query.days ?? 30;
    const range = getKillAnalyticsRange(yield* DateTime.now, days);
    const scopes = yield* loadUserLootScopes(database, discordId);

    const characterId =
      query.characterId === undefined
        ? undefined
        : Number.parseInt(query.characterId, 10);

    if (
      !scopes.some((scope) => userLootScopeAccess(scope, discordId)) ||
      (characterId !== undefined && !Number.isSafeInteger(characterId))
    )
      return empty;

    const loots = yield* runLootStatsQuery(
      "loot-stats.user-loots",
      buildUserLootIdsQuery(database, {
        discordId,
        start: range.start,
        world: query.world,
        characterId,
        visibleRecord: buildUserLootRecordCondition(
          scopes,
          discordId,
          lootPlayerTable.lootId,
        ),
      }),
    );

    const lootIds = loots.map(({ lootId }) => lootId);

    const readLoots = Effect.gen(function* () {
      const characters = yield* database
        .select({
          accountId: userCharactersLootlogSettingsTable.accountId,
          characterId: userCharactersLootlogSettingsTable.characterId,
        })
        .from(userCharactersLootlogSettingsTable)
        .where(
          and(
            eq(userCharactersLootlogSettingsTable.userId, discordId),
            query.characterId === undefined
              ? undefined
              : eq(
                  userCharactersLootlogSettingsTable.characterId,
                  query.characterId,
                ),
          ),
        );

      // Loot shares name a player by character id followed by account id.
      const charactersByShareKey = new Map(
        characters.map((character) => [
          `${character.characterId}${character.accountId}`,
          character,
        ]),
      );

      const shareKeys = [...charactersByShareKey.keys()];

      const caughtItems = buildUserCaughtItemsQueries(database, {
        lootIds,
        shareKeys,
      });

      const [soloLoots, sharedItems] = yield* Effect.all(
        [
          runLootStatsQuery(
            "loot-stats.user-solo-loots",
            caughtItems.soloLoots,
          ),
          shareKeys.length
            ? runLootStatsQuery(
                "loot-stats.user-shared-items",
                caughtItems.sharedItems,
              )
            : Effect.succeed([]),
        ] as const,
        { concurrency: "unbounded" },
      );

      const queries = buildUserLootStatsQueries(database, {
        lootIds,
        soloLootIds: soloLoots.map(({ lootId }) => lootId),
        sharedHids: sharedItems.map(({ share: [, hid] }) => hid),
        truncUnit: days > 30 ? "week" : "day",
      });

      const [overview, { timeline }, topNpcs, legendRows] = yield* Effect.all(
        [
          readLootStatsOverview(queries.overview),
          readLootStatsRarityTimeline(queries.timeline),
          readLootStatsTopNpcs(queries.topNpcs),
          runLootStatsQuery("loot-stats.user-legends", queries.legends),
        ] as const,
        { concurrency: "unbounded" },
      );

      // The character that caught each item, as the caught filter chose it.
      const soloCharacters = new Map(
        soloLoots.map(({ lootId, accountId, characterId }) => [
          lootId,
          { accountId: String(accountId), characterId: String(characterId) },
        ]),
      );

      const sharedCharacters = new Map(
        sharedItems.flatMap(({ share: [shareKey, hid] }) => {
          const character = charactersByShareKey.get(shareKey);

          return character ? [[hid, character] as const] : [];
        }),
      );

      const caughtCharacter = (caughtItem: CaughtItem) =>
        sharedCharacters.get(caughtItem.hid) ??
        soloCharacters.get(caughtItem.lootId);

      return { overview, timeline, topNpcs, legendRows, caughtCharacter };
    });

    const lootStats = lootIds.length ? yield* readLoots : undefined;
    const legendRows = lootStats?.legendRows ?? [];
    const caughtCharacter = lootStats?.caughtCharacter;

    // A boss's name is unique on its world, while its id is not: kills name a
    // colossus by a stable id from its name, and older Game clients reported
    // a loot's monster by its template id instead of the spawn id kills use.
    const monsterKey = (row: { world: string; name: string }) =>
      `${row.world}:${row.name}`;

    const legendMonsterKey = (row: (typeof legendRows)[number]) =>
      monsterKey({ world: row.world, name: row.npc_name });

    // Each monster that dropped a legend, on the world it dropped it.
    const legendMonsters = Object.values(
      groupBy(legendRows, legendMonsterKey),
    ).flatMap(([row]) => (row ? [row] : []));

    const killBuckets =
      characterId === undefined
        ? userKillBucketTable
        : userCharacterKillBucketTable;

    // The latest bucket names the monster, as the kill statistics do.
    const latest = <T>(column: AnyPgColumn) =>
      sql<T>`(array_agg(${column} order by ${killBuckets.periodStart} desc))[1]`;

    const kills = yield* runLootStatsQuery(
      "loot-stats.user-monster-kills",
      database
        .select({
          world: killBuckets.world,
          name: killBuckets.npcName,
          npcId: latest<number>(killBuckets.npcId),
          lvl: latest<number>(killBuckets.npcLvl),
          icon: latest<string | null>(killBuckets.npcIcon),
          kills: sql<number>`sum(${killBuckets.kills})`.mapWith(Number),
        })
        .from(killBuckets)
        .where(
          and(
            eq(killBuckets.discordUserId, discordId),
            gte(killBuckets.periodStart, sql`${range.start}::timestamptz`),
            query.world ? eq(killBuckets.world, query.world) : undefined,
            characterId === undefined
              ? undefined
              : eq(
                  userCharacterKillBucketTable.characterId,
                  String(characterId),
                ),
            or(
              inArray(killBuckets.npcType, [...BOSS_TYPES]),
              // Any monster that dropped a legend, whatever its type.
              legendMonsters.length
                ? sql`(${killBuckets.world}, ${killBuckets.npcName}) IN (SELECT * FROM unnest(${sql.param(legendMonsters.map((row) => row.world))}::text[], ${sql.param(legendMonsters.map((row) => row.npc_name))}::text[]))`
                : undefined,
            ),
          ),
        )
        .groupBy(killBuckets.world, killBuckets.npcName),
    );

    const killsByMonster = new Map(kills.map((row) => [monsterKey(row), row]));

    const dropsByMonster = groupBy(legendRows, legendMonsterKey);

    // The kills' id names the monster; without kills, the lowest loot id does.
    const monsterNpcId = (key: string) =>
      killsByMonster.get(key)?.npcId ??
      Math.min(...(dropsByMonster[key] ?? []).map((row) => row.npc_id));

    const legendGroups = Object.values(
      groupBy(legendRows, (row) => `${row.item_id}:${legendMonsterKey(row)}`),
    );

    const catchesByLegend = legendGroups.map((rows) =>
      countCatches(rows, caughtCharacter),
    );

    const characterNames = yield* readCharacterNames(
      database,
      lootIds,
      Object.values(groupBy(catchesByLegend.flat(), characterKey)).flatMap(
        ([character]) => (character ? [character] : []),
      ),
    );

    const legends = legendGroups
      .flatMap((rows, index) => {
        const [row] = rows;

        if (!row) return [];
        const key = legendMonsterKey(row);

        return [
          {
            itemId: row.item_id,
            name: row.name,
            icon: row.icon,
            stat: row.stat,
            type: row.type,
            world: row.world,
            npc: {
              id: monsterNpcId(key),
              name: row.npc_name,
              lvl: row.npc_lvl,
              icon: row.npc_icon,
            },
            count: rows.reduce(
              (total, merged) => total + Number(merged.count),
              0,
            ),
            caught: rows.reduce((total, merged) => total + merged.caught, 0),
            caughtBy: (catchesByLegend[index] ?? [])
              .flatMap((character) => {
                const name = characterNames.get(characterKey(character));

                return name
                  ? [
                      {
                        characterId: character.characterId,
                        name,
                        caught: character.caught,
                      },
                    ]
                  : [];
              })
              .toSorted(
                (left, right) =>
                  right.caught - left.caught ||
                  left.name.localeCompare(right.name, "pl"),
              ),
            npcKills: killsByMonster.get(key)?.kills ?? 0,
          },
        ];
      })
      .sort(
        (left, right) =>
          right.count - left.count ||
          right.caught - left.caught ||
          left.name.localeCompare(right.name, "pl"),
      );

    // Every boss the user killed, and every monster that dropped them a legend.
    const monsters = [
      ...new Set([...killsByMonster.keys(), ...Object.keys(dropsByMonster)]),
    ]
      .flatMap((key) => {
        const killed = killsByMonster.get(key);
        const drops = dropsByMonster[key] ?? [];
        const [drop] = drops;

        const monster = killed
          ? {
              world: killed.world,
              npc: {
                id: killed.npcId,
                name: killed.name,
                lvl: killed.lvl,
                icon: killed.icon,
              },
            }
          : drop && {
              world: drop.world,
              npc: {
                id: monsterNpcId(key),
                name: drop.npc_name,
                lvl: drop.npc_lvl,
                icon: drop.npc_icon,
              },
            };

        return monster
          ? [
              {
                ...monster,
                kills: killed?.kills ?? 0,
                legends: drops.reduce(
                  (total, row) => total + Number(row.count),
                  0,
                ),
                caught: drops.reduce((total, row) => total + row.caught, 0),
              },
            ]
          : [];
      })
      .sort(
        (left, right) =>
          right.kills - left.kills ||
          right.legends - left.legends ||
          left.npc.name.localeCompare(right.npc.name, "pl"),
      );

    return {
      overview: {
        ...(lootStats?.overview ?? empty.overview),
        caughtLegendaryItems: legends.reduce(
          (total, legend) => total + legend.caught,
          0,
        ),
      },
      timeline: lootStats?.timeline ?? [],
      topNpcs: lootStats?.topNpcs ?? [],
      legends,
      monsters,
    } satisfies UserLootStatsResponse;
  });
