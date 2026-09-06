import { MapPlayersSnapshot } from "#src/contracts/loots/map-players-snapshot";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { Permission } from "@lootlog/schema/permissions";
import { Effect, Schema } from "effect";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import type { LootsQuery as FetchLootsParamsDto } from "#src/contracts/loots/schemas";
import type { LootItemDto } from "#src/loots/query/loot-item";
import type { LootQueryResult } from "#src/loots/query/loot-query-result";
import { LootShareResponse } from "@lootlog/protocol/loot-summary";
import {
  mapItem,
  mapPlayer,
  mapNpc,
} from "#src/loots/query/loot-snapshot-mappers";
import { DEFAULT_PAGE_LIMIT } from "#src/loots/config/pagination";
import type { LootQueryPersistence } from "#src/loots/query/loot-query.persistence";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;
type LootQueryRecord = Effect.Success<
  ReturnType<LootQueryPersistence["findMany"]>
>[number];

export class LootQueryError extends TaggedErrorClass<LootQueryError>()(
  "LootQueryError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type QueryEffect<A> = Effect.Effect<A, LootQueryError>;

export interface LootQueryOperations {
  readonly fetchLootsByGuildId: (
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) => QueryEffect<LootQueryResult[]>;
  readonly countLootsByGuildId: (
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) => QueryEffect<number>;
  readonly fetchLootById: (
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    lootId: number,
  ) => QueryEffect<LootQueryResult | null>;
  readonly resolveLootItemByHid: (
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    options: { readonly hid: string; readonly world?: string },
  ) => QueryEffect<LootItemDto | null>;
}

const mapLoot = (guildId: string, loot: LootQueryRecord): LootQueryResult => ({
  id: loot.id,
  uniqueId: loot.uniqueId,
  world: loot.world,
  source: loot.source,
  location: loot.location,
  mapPlayersSnapshot: Schema.decodeUnknownSync(
    Schema.NullOr(MapPlayersSnapshot),
  )(loot.mapPlayersSnapshot),
  lootShare: Object.fromEntries(
    Object.entries(
      Schema.decodeUnknownSync(LootShareResponse)(loot.lootShare),
    ).map(([key, values]) => [key, [...values]]),
  ),
  createdAt: loot.createdAt,
  updatedAt: loot.updatedAt,
  items: loot.lootItems.map(mapItem),
  players: loot.lootPlayers.map(mapPlayer),
  npcs: loot.lootNpcs.map(mapNpc),
  submissions: loot.submissions.map((submission) => ({
    guildId,
    lootId: loot.id,
    memberId: submission.memberId,
    member: submission.member,
  })),
  commentsCount: loot.commentsCount,
});

export const makeLootQueryOperations = (
  persistence: LootQueryPersistence,
): LootQueryOperations => {
  const attempt = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new LootQueryError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "loots.query", retryCount: 0 },
      }),
    );

  const resolveItemSnapshotIds = (itemNames?: readonly string[]) => {
    const names = Array.from(
      new Set((itemNames ?? []).map((name) => name.trim()).filter(Boolean)),
    );
    return names.length === 0
      ? Effect.succeed(undefined)
      : attempt(
          "loots.query.itemSnapshots",
          persistence.findItemSnapshotIds(names),
        ).pipe(Effect.map((snapshots) => snapshots.map(({ id }) => id)));
  };

  return {
    fetchLootsByGuildId: (guild, permissions, roles, params) =>
      Effect.gen(function* () {
        const itemSnapshotIds = yield* resolveItemSnapshotIds(params.itemNames);
        if (itemSnapshotIds?.length === 0) return [];
        const records = yield* attempt(
          "loots.query.list",
          persistence.findMany({
            guildId: guild.id,
            permissions,
            roles,
            filters: {
              npcTypes: params.npcTypes ?? [],
              npcs: params.npcs ?? [],
              players: params.players ?? [],
              rarities: params.rarities ?? [],
              professions: params.professions ?? [],
              npcLevelMin: params.npcLevelMin,
              npcLevelMax: params.npcLevelMax,
              itemLevelMin: params.itemLevelMin,
              itemLevelMax: params.itemLevelMax,
              playerLevelMin: params.playerLevelMin,
              playerLevelMax: params.playerLevelMax,
              search: params.search,
              world: params.world,
              hid: params.hid,
              itemSnapshotIds,
              cursor: params.cursor ?? null,
              createdAtMin: params.createdAtMin,
              createdAtMax: params.createdAtMax,
            },
            limit: params.limit ?? DEFAULT_PAGE_LIMIT,
          }),
        );
        return records.map((loot) => mapLoot(guild.id, loot));
      }),

    countLootsByGuildId: (guild, permissions, roles, params) =>
      Effect.gen(function* () {
        const itemSnapshotIds = yield* resolveItemSnapshotIds(params.itemNames);
        if (itemSnapshotIds?.length === 0) return 0;
        return yield* attempt(
          "loots.query.count",
          persistence.count({
            guildId: guild.id,
            permissions,
            roles,
            filters: {
              npcTypes: params.npcTypes ?? [],
              npcs: params.npcs ?? [],
              players: params.players ?? [],
              rarities: params.rarities ?? [],
              professions: params.professions ?? [],
              npcLevelMin: params.npcLevelMin,
              npcLevelMax: params.npcLevelMax,
              itemLevelMin: params.itemLevelMin,
              itemLevelMax: params.itemLevelMax,
              playerLevelMin: params.playerLevelMin,
              playerLevelMax: params.playerLevelMax,
              search: params.search,
              world: params.world,
              hid: params.hid,
              itemSnapshotIds,
              cursor: null,
              createdAtMin: params.createdAtMin,
              createdAtMax: params.createdAtMax,
            },
          }),
        );
      }),

    fetchLootById: (guild, permissions, roles, lootId) =>
      attempt(
        "loots.query.byId",
        persistence.findOne({
          guildId: guild.id,
          permissions,
          roles,
          filters: { lootId },
        }),
      ).pipe(Effect.map((loot) => (loot ? mapLoot(guild.id, loot) : null))),

    resolveLootItemByHid: (guild, permissions, roles, options) => {
      const hid = options.hid.trim();
      if (!hid) return Effect.succeed(null);
      return attempt(
        "loots.query.resolveItem",
        persistence.resolveItemByHid({
          guildId: guild.id,
          permissions,
          roles,
          hid,
          world: options.world,
        }),
      ).pipe(Effect.map((item) => (item ? mapItem(item) : null)));
    },
  };
};
