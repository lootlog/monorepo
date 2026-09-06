import { MapPlayersSnapshot } from "./map-players-snapshot.js";
import {
  LootItemResponse as LootItem,
  LootPlayerResponse as LootPlayer,
  LootNpcResponse as LootNpc,
  LootShareResponse as LootShare,
} from "@lootlog/protocol/loot-summary";
/** Shared input and output schemas for the loots feature. */
import * as Schema from "effect/Schema";
import {
  PageSize,
  LevelFilter,
  JsonValue,
  NonEmptyString,
  SafeInteger,
  DateTimeWithOffsetString,
  DateTimeString,
  FiniteNumber,
} from "@lootlog/schema/http-scalars";
import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import { LootSourceSchema } from "@lootlog/schema/loot";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";

const LootSubmission = Schema.Struct({
  guildId: Schema.String,
  memberId: FiniteNumber,
  lootId: FiniteNumber,
  member: Schema.Struct({
    name: Schema.String,
    avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
    userId: Schema.String,
  }),
});

const LootRecord = Schema.Struct({
  id: FiniteNumber,
  uniqueId: Schema.String,
  world: Schema.String,
  source: LootSourceSchema,
  location: Schema.String,
  items: Schema.Array(LootItem),
  players: Schema.Array(LootPlayer),
  mapPlayersSnapshot: Schema.NullOr(MapPlayersSnapshot),
  npcs: Schema.Array(LootNpc),
  lootShare: LootShare,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  submissions: Schema.optionalKey(Schema.Array(LootSubmission)),
  commentsCount: FiniteNumber,
});

export type LootResponse = typeof LootResponse.Type;

export const LootResponse = LootRecord.annotate({
  identifier: "LootResponseDto",
});

export type LootStatsResponse = typeof LootStatsResponse.Type;

export const LootStatsResponse = Schema.Struct({
  overview: Schema.Struct({
    totalLoots: FiniteNumber,
    totalItems: FiniteNumber,
    legendaryItems: FiniteNumber,
    heroicItems: FiniteNumber,
    avgItemLevel: FiniteNumber,
  }),
  byRarity: Schema.Record(
    Schema.String,
    Schema.Struct({
      count: FiniteNumber,
      percentage: FiniteNumber,
    }),
  ),
  timeline: Schema.Array(
    Schema.Struct({
      date: Schema.String,
      total: FiniteNumber,
      byRarity: Schema.Record(Schema.String, FiniteNumber),
    }),
  ),
  topNpcs: Schema.Array(
    Schema.Struct({
      npcId: FiniteNumber,
      name: Schema.String,
      type: Schema.Union([NpcTypeSchema, Schema.Null]),
      lvl: Schema.Union([FiniteNumber, Schema.Null]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      count: FiniteNumber,
      byRarity: Schema.Record(Schema.String, FiniteNumber),
    }),
  ),
  topContributors: Schema.Array(
    Schema.Struct({
      memberId: FiniteNumber,
      name: Schema.String,
      avatar: Schema.Union([Schema.String, Schema.Null]),
      userId: Schema.String,
      count: FiniteNumber,
      byRarity: Schema.Record(Schema.String, FiniteNumber),
    }),
  ),
  topItems: Schema.Array(
    Schema.Struct({
      itemId: FiniteNumber,
      hid: Schema.String,
      name: Schema.String,
      icon: Schema.String,
      rarity: ItemRaritySchema,
      lvl: FiniteNumber,
      count: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "LootStatsResponseDto_Output" });

export type LootCountResponse = typeof LootCountResponse.Type;

export const LootCountResponse = Schema.Struct({
  count: FiniteNumber,
}).annotate({ identifier: "CountResponseDto_Output" });

export type ResolvedLootItemResponse = typeof ResolvedLootItemResponse.Type;

export const ResolvedLootItemResponse = LootItem.annotate({
  identifier: "NullableLootItemResponseDto_Output",
});

export type LootDetailResponse = typeof LootDetailResponse.Type;

export const LootDetailResponse = Schema.Union([
  Schema.StructWithRest(LootRecord, [Schema.Record(Schema.String, JsonValue)]),
  Schema.Null,
]).annotate({ identifier: "NullableLootResponseDto" });

export type CreateLootRequest = typeof CreateLootRequest.Type;

export const CreateLootRequest = Schema.Struct({
  mapPlayersSnapshot: Schema.optionalKey(MapPlayersSnapshot),
  loots: Schema.Array(
    Schema.Struct({
      hid: NonEmptyString,
      name: NonEmptyString,
      icon: NonEmptyString,
      pr: FiniteNumber,
      prc: NonEmptyString,
      stat: NonEmptyString,
      id: FiniteNumber,
      cl: FiniteNumber,
      own: Schema.optionalKey(FiniteNumber),
    }),
  )
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isMaxLength(10).annotate({
        expected: "a value with a length of at most 10",
      }),
    ),
  npcs: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      name: NonEmptyString,
      location: NonEmptyString,
      lvl: FiniteNumber,
      prof: Schema.optionalKey(Schema.String),
      wt: FiniteNumber,
      hpp: Schema.optionalKey(FiniteNumber),
      icon: NonEmptyString,
      type: FiniteNumber,
      x: Schema.optionalKey(FiniteNumber),
      y: Schema.optionalKey(FiniteNumber),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  players: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      accountId: FiniteNumber,
      name: NonEmptyString,
      lvl: FiniteNumber,
      prof: NonEmptyString,
      icon: NonEmptyString,
      hpp: Schema.optionalKey(FiniteNumber),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  world: NonEmptyString,
  source: LootSourceSchema,
  location: NonEmptyString,
  accountId: NonEmptyString,
  characterId: NonEmptyString,
}).annotate({ identifier: "CreateLootDto" });

export type CreateLootResponse = typeof CreateLootResponse.Type;

export const CreateLootResponse = Schema.Struct({
  id: FiniteNumber,
  submittedGuilds: Schema.Array(
    Schema.Struct({ guildId: Schema.String, guildName: Schema.String }),
  ),
  rejectedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      guildName: Schema.String,
      reason: Schema.Literals([
        "NOT_ON_CHARACTER_WHITELIST",
        "MISSING_LOOTLOG_CONFIG",
        "LOOT_NOT_ACCEPTED_BY_CONFIG",
        "MISSING_MEMBER",
      ]),
    }),
  ),
}).annotate({ identifier: "CreateLootResponseDto_Output" });

export type LootCommentResponse = typeof LootCommentResponse.Type;

export const LootCommentResponse = Schema.Struct({
  id: FiniteNumber,
  lootId: FiniteNumber,
  guildId: Schema.String,
  content: Schema.String,
  member: Schema.Struct({
    name: Schema.String,
    avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
    userId: Schema.String,
    roles: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          color: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
        }),
      ),
    ),
  }),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "LootCommentResponseDto" });

export type CreateLootCommentRequest = typeof CreateLootCommentRequest.Type;

export const CreateLootCommentRequest = Schema.Struct({
  content: NonEmptyString,
}).annotate({ identifier: "CreateCommentDto" });

export type UpdateLootShareRequest = typeof UpdateLootShareRequest.Type;

export const UpdateLootShareRequest = Schema.Struct({
  msg: Schema.String,
}).annotate({
  identifier: "UpdateLootDto",
});

export type LootShareResponse = typeof LootShareResponse.Type;

export const LootShareResponse = LootShare.annotate({
  identifier: "LootShareResponseDto_Output",
});

export type LootOrganizationPath = typeof LootOrganizationPath.Type;

export const LootOrganizationPath = Schema.Struct({
  guildId: JsonValue,
});

export type LootsQuery = typeof LootsQuery.Type;

export const LootsQuery = Schema.Struct({
  limit: Schema.optionalKey(PageSize),
  cursor: Schema.optionalKey(SafeInteger),
  npcs: Schema.optionalKey(Schema.Array(Schema.String)),
  players: Schema.optionalKey(Schema.Array(Schema.String)),
  rarities: Schema.optionalKey(Schema.Array(Schema.String)),
  professions: Schema.optionalKey(Schema.Array(Schema.String)),
  npcTypes: Schema.optionalKey(Schema.Array(Schema.String)),
  world: Schema.optionalKey(Schema.String),
  npcLevelMin: Schema.optionalKey(LevelFilter),
  npcLevelMax: Schema.optionalKey(LevelFilter),
  itemLevelMin: Schema.optionalKey(LevelFilter),
  itemLevelMax: Schema.optionalKey(LevelFilter),
  playerLevelMin: Schema.optionalKey(LevelFilter),
  playerLevelMax: Schema.optionalKey(LevelFilter),
  search: Schema.optionalKey(Schema.String),
  hid: Schema.optionalKey(Schema.String),
  itemNames: Schema.optionalKey(Schema.Array(Schema.String)),
  createdAtMin: Schema.optionalKey(DateTimeWithOffsetString),
  createdAtMax: Schema.optionalKey(DateTimeWithOffsetString),
});

export type LootListResponse = typeof LootListResponse.Type;

export const LootListResponse = Schema.Array(LootResponse);

export type LootStatsQuery = typeof LootStatsQuery.Type;

export const LootStatsQuery = Schema.Struct({
  period: Schema.optionalKey(
    Schema.Literals([
      "24h",
      "3d",
      "7d",
      "14d",
      "30d",
      "90d",
      "180d",
      "all",
    ]).annotate({ default: "7d" }),
  ),
  world: Schema.optionalKey(Schema.String),
  npcTypes: Schema.optionalKey(Schema.String),
  excludeColossus: Schema.optionalKey(Schema.Boolean),
});

export type ResolveLootItemQuery = typeof ResolveLootItemQuery.Type;

export const ResolveLootItemQuery = Schema.Struct({
  hid: NonEmptyString,
  world: Schema.optionalKey(Schema.String),
});

export type LootPath = typeof LootPath.Type;

export const LootPath = Schema.Struct({
  lootId: FiniteNumber,
  guildId: JsonValue,
});

export type LootCommentsResponse = typeof LootCommentsResponse.Type;

export const LootCommentsResponse = Schema.Array(LootCommentResponse);

export type LootSharePath = typeof LootSharePath.Type;

export const LootSharePath = Schema.Struct({
  id: FiniteNumber,
});
