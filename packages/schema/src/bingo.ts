import { Schema } from "effect";
import { ItemRaritySchema } from "./item-rarity.js";
import { NpcTypeSchema } from "./npc-type.js";

export const BINGO_BOARD_SIZE = 5;

export const BingoBoardMode = {
  RACE: "RACE",
  LOCKOUT: "LOCKOUT",
} as const;

export type BingoBoardMode =
  (typeof BingoBoardMode)[keyof typeof BingoBoardMode];

export const BingoBoardModeSchema = Schema.Literals(
  Object.values(BingoBoardMode),
);

export const BingoBoardStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
} as const;

export type BingoBoardStatus =
  (typeof BingoBoardStatus)[keyof typeof BingoBoardStatus];

export const BingoBoardStatusSchema = Schema.Literals(
  Object.values(BingoBoardStatus),
);

export const BingoTileConditionKind = {
  LOOT: "LOOT",
  KILL: "KILL",
  HERO_SIGHTING: "HERO_SIGHTING",
  BATTLE: "BATTLE",
  MANUAL: "MANUAL",
} as const;

export type BingoTileConditionKind =
  (typeof BingoTileConditionKind)[keyof typeof BingoTileConditionKind];

export const BingoTileConditionKindSchema = Schema.Literals(
  Object.values(BingoTileConditionKind),
);

export const BingoBattleMetric = {
  WINS: "WINS",
  WIN_STREAK: "WIN_STREAK",
} as const;

export type BingoBattleMetric =
  (typeof BingoBattleMetric)[keyof typeof BingoBattleMetric];

const BingoBattleMetricSchema = Schema.Literals(
  Object.values(BingoBattleMetric),
);

export const BingoLineIdSchema = Schema.Literals([
  "row-0",
  "row-1",
  "row-2",
  "row-3",
  "row-4",
  "col-0",
  "col-1",
  "col-2",
  "col-3",
  "col-4",
  "diag-main",
  "diag-anti",
]);

export type BingoLineId = typeof BingoLineIdSchema.Type;

const PositiveTargetCount = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(1),
  Schema.isLessThanOrEqualTo(100_000),
);

const LevelBound = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(1),
  Schema.isLessThanOrEqualTo(500),
);

const OptionalPattern = Schema.optionalKey(
  Schema.NullOr(Schema.String.check(Schema.isMaxLength(120))),
);

const BingoLootConditionSchema = Schema.Struct({
  kind: Schema.Literal(BingoTileConditionKind.LOOT),
  targetCount: PositiveTargetCount,
  rarities: Schema.mutable(Schema.Array(ItemRaritySchema)),
  npcTypes: Schema.mutable(Schema.Array(NpcTypeSchema)),
  npcNamePattern: OptionalPattern,
  itemNamePattern: OptionalPattern,
  minNpcLvl: Schema.optionalKey(Schema.NullOr(LevelBound)),
  maxNpcLvl: Schema.optionalKey(Schema.NullOr(LevelBound)),
});

export type BingoLootCondition = typeof BingoLootConditionSchema.Type;

const BingoKillConditionSchema = Schema.Struct({
  kind: Schema.Literal(BingoTileConditionKind.KILL),
  targetCount: PositiveTargetCount,
  npcTypes: Schema.mutable(Schema.Array(NpcTypeSchema)),
  npcNamePattern: OptionalPattern,
  minNpcLvl: Schema.optionalKey(Schema.NullOr(LevelBound)),
  maxNpcLvl: Schema.optionalKey(Schema.NullOr(LevelBound)),
});

export type BingoKillCondition = typeof BingoKillConditionSchema.Type;

const BingoHeroSightingConditionSchema = Schema.Struct({
  kind: Schema.Literal(BingoTileConditionKind.HERO_SIGHTING),
  targetCount: PositiveTargetCount,
  heroNamePattern: OptionalPattern,
  minHeroLvl: Schema.optionalKey(Schema.NullOr(LevelBound)),
  maxHeroLvl: Schema.optionalKey(Schema.NullOr(LevelBound)),
  includeManual: Schema.Boolean,
});

export type BingoHeroSightingCondition =
  typeof BingoHeroSightingConditionSchema.Type;

const BingoBattleConditionSchema = Schema.Struct({
  kind: Schema.Literal(BingoTileConditionKind.BATTLE),
  targetCount: PositiveTargetCount,
  metric: BingoBattleMetricSchema,
  matchmakingOnly: Schema.Boolean,
  battleTypes: Schema.mutable(Schema.Array(Schema.NonEmptyString)),
  excludeFlee: Schema.Boolean,
});

export type BingoBattleCondition = typeof BingoBattleConditionSchema.Type;

const BingoManualConditionSchema = Schema.Struct({
  kind: Schema.Literal(BingoTileConditionKind.MANUAL),
  targetCount: PositiveTargetCount,
});

export const BingoTileConditionSchema = Schema.Union([
  BingoLootConditionSchema,
  BingoKillConditionSchema,
  BingoHeroSightingConditionSchema,
  BingoBattleConditionSchema,
  BingoManualConditionSchema,
]);

export type BingoTileCondition = typeof BingoTileConditionSchema.Type;

const BingoUpdateReasonSchema = Schema.Literals([
  "board_created",
  "board_updated",
  "board_deleted",
  "tiles_updated",
  "tile_progress",
  "tile_completed",
  "line_completed",
]);

export const BingoRealtimeUpdateSchema = Schema.Struct({
  guildId: Schema.NonEmptyString,
  boardId: Schema.NonEmptyString,
  reason: BingoUpdateReasonSchema,
  memberId: Schema.optionalKey(Schema.Finite),
  memberName: Schema.optionalKey(Schema.String),
  tileId: Schema.optionalKey(Schema.NonEmptyString),
  tileTitle: Schema.optionalKey(Schema.String),
  completedLinesCount: Schema.optionalKey(Schema.Finite),
  blackout: Schema.optionalKey(Schema.Boolean),
});

export type BingoRealtimeUpdate = typeof BingoRealtimeUpdateSchema.Type;

const BingoMilestoneKindSchema = Schema.Literals([
  "TILE_COMPLETED",
  "LINE_COMPLETED",
  "BLACKOUT",
]);

export const BingoMilestoneNotificationEventSchema = Schema.Struct({
  guildId: Schema.NonEmptyString,
  boardId: Schema.NonEmptyString,
  boardName: Schema.NonEmptyString,
  world: Schema.NullOr(Schema.String),
  eventId: Schema.NonEmptyString,
  milestoneKind: BingoMilestoneKindSchema,
  memberId: Schema.Finite,
  memberName: Schema.NonEmptyString,
  tileId: Schema.NonEmptyString,
  tileTitle: Schema.NonEmptyString,
  row: Schema.Int,
  col: Schema.Int,
  summary: Schema.String,
  completedTileCount: Schema.Int,
  completedLinesCount: Schema.Int,
  totalPoints: Schema.Int,
  occurredAt: Schema.NonEmptyString,
});

export type BingoMilestoneNotificationEvent =
  typeof BingoMilestoneNotificationEventSchema.Type;

export const BattleRecordedV1Schema = Schema.Struct({
  version: Schema.Literal(1),
  battleId: Schema.NonEmptyString,
  userId: Schema.NonEmptyString,
  accountId: Schema.NonEmptyString,
  characterId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  battleType: Schema.NonEmptyString,
  matchmaking: Schema.Boolean,
  won: Schema.Boolean,
  unfinished: Schema.Boolean,
  hasFlee: Schema.Boolean,
  occurredAt: Schema.NonEmptyString,
});

export type BattleRecordedV1 = typeof BattleRecordedV1Schema.Type;
