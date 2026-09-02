import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { ProfessionEnum as Profession } from "@lootlog/schema/loot";
import type { Permission } from "@lootlog/schema/permissions";
import { Effect, Schema } from "effect";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import type { LootsControllerFetchLootsByGuildIdQuery as FetchLootsParamsDto } from "#src/http-api/lootlog-api";
import type { LootItemDto } from "../dto/loot-item.dto.js";
import type { LootNpcDto } from "../dto/loot-npc.dto.js";
import type { LootQueryResult } from "../dto/loot-query-result.dto.js";
import { LootShareResponse } from "#src/loots/loot-response.schema";
import { getProfByShortname } from "#src/shared/utils/get-prof-by-shortname";
import { DEFAULT_PAGE_LIMIT } from "../config/pagination.js";
import type { LootQueryPersistence } from "./loot-query.persistence.js";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;
type LootQueryRecord = Effect.Success<
  ReturnType<LootQueryPersistence["findMany"]>
>[number];
type LootItemWithSnapshot = LootQueryRecord["lootItems"][number];
type LootPlayerWithSnapshot = LootQueryRecord["lootPlayers"][number];
type LootNpcWithSnapshot = LootQueryRecord["lootNpcs"][number];

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

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStatValue = (statRaw: string, key: string): string | null => {
  const prefix = `${key}=`;
  const segment = statRaw.split(";").find((entry) => entry.startsWith(prefix));
  return segment?.slice(prefix.length) ?? null;
};

const parseRequiredProf = (required?: string | null): Profession[] =>
  required
    ? required
        .split("")
        .map((short) => getProfByShortname(short))
        .filter(Boolean)
    : Object.values(Profession);

const mapItem = (lootItem: LootItemWithSnapshot): LootItemDto => {
  const statRaw = lootItem.itemSnapshot.statRaw;
  const lvl =
    lootItem.itemSnapshot.lvl ??
    parseNumber(parseStatValue(statRaw, "lvl")) ??
    0;
  return {
    id: lootItem.itemSnapshot.itemId,
    hid: lootItem.hid,
    name: lootItem.itemSnapshot.name,
    icon: lootItem.itemSnapshot.icon,
    stat: statRaw,
    type: lootItem.itemSnapshot.itemType,
    rarity: lootItem.itemSnapshot.rarity,
    lvl,
    prof: parseRequiredProf(parseStatValue(statRaw, "reqp")),
  };
};

const mapPlayer = (lootPlayer: LootPlayerWithSnapshot) => {
  const snapshot = lootPlayer.playerSnapshot;
  const accountId = parseNumber(snapshot.accountId);
  const characterId = parseNumber(snapshot.characterId);
  return {
    id: `${characterId ?? snapshot.characterId}${accountId ?? snapshot.accountId}`,
    name: snapshot.name,
    lvl: lootPlayer.lvl ?? null,
    prof: snapshot.prof,
    icon: snapshot.icon,
    characterId,
    accountId,
    hpp: lootPlayer.hpp,
  };
};

const mapNpc = (lootNpc: LootNpcWithSnapshot): LootNpcDto => ({
  id: lootNpc.npcSnapshot.npcId,
  name: lootNpc.npcSnapshot.name,
  wt: lootNpc.npcSnapshot.wt ?? null,
  lvl: lootNpc.npcSnapshot.lvl ?? null,
  prof: lootNpc.npcSnapshot.prof ?? null,
  icon: lootNpc.npcSnapshot.icon,
  type: lootNpc.npcSnapshot.type,
  margonemType: lootNpc.npcSnapshot.margonemType ?? null,
});

const mapLoot = (guildId: string, loot: LootQueryRecord): LootQueryResult => ({
  id: loot.id,
  uniqueId: loot.uniqueId,
  world: loot.world,
  source: loot.source,
  location: loot.location,
  lootShare: Object.fromEntries(
    Object.entries(
      Schema.decodeUnknownSync(LootShareResponse)(loot.lootShare),
    ).map(([key, values]) => [key, [...values]]),
  ),
  createdAt: loot.createdAt,
  updatedAt: loot.updatedAt,
  items: (loot.lootItems as unknown as LootItemWithSnapshot[]).map(mapItem),
  players: (loot.lootPlayers as unknown as LootPlayerWithSnapshot[]).map(
    mapPlayer,
  ),
  npcs: (loot.lootNpcs as unknown as LootNpcWithSnapshot[]).map(mapNpc),
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
