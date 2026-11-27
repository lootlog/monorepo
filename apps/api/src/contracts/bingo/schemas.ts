import {
  BINGO_MAX_BOARD_SIZE,
  BingoBoardModeSchema,
  BingoBoardSizeSchema,
  BingoBoardStatusSchema,
  BingoLineIdSchema,
  BingoTileConditionKindSchema,
  BingoTileConditionSchema,
} from "@lootlog/schema/bingo";
import {
  DateTimeString,
  FiniteNumber,
  NonEmptyString,
} from "@lootlog/schema/http-scalars";
import * as Schema from "effect/Schema";

const BoardName = NonEmptyString.check(
  Schema.isMaxLength(100).annotate({
    expected: "a value with a length of at most 100",
  }),
);

const BoardDescription = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(500)),
);

const TileTitle = NonEmptyString.check(
  Schema.isMaxLength(80).annotate({
    expected: "a value with a length of at most 80",
  }),
);

const TileDescription = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(240)),
);

const GridIndex = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThan(BINGO_MAX_BOARD_SIZE),
);

const NonNegativeScore = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(10_000),
);

export const BingoGuildPath = Schema.Struct({
  guildId: NonEmptyString,
});

export const BingoBoardPath = Schema.Struct({
  guildId: NonEmptyString,
  boardId: NonEmptyString,
});

export const BingoTilePath = Schema.Struct({
  guildId: NonEmptyString,
  boardId: NonEmptyString,
  tileId: NonEmptyString,
});

export const BingoMemberSummary = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  name: Schema.String,
  avatar: Schema.NullOr(Schema.String),
});

export type BingoMemberSummary = typeof BingoMemberSummary.Type;

export const BingoTileProgressEntry = Schema.Struct({
  tileId: Schema.String,
  memberId: FiniteNumber,
  currentCount: FiniteNumber,
  targetCount: FiniteNumber,
  completedAt: Schema.NullOr(DateTimeString),
  manualOverride: Schema.Boolean,
  updatedAt: DateTimeString,
});

export type BingoTileProgressEntry = typeof BingoTileProgressEntry.Type;

export const BingoTileResponse = Schema.Struct({
  id: Schema.String,
  boardId: Schema.String,
  row: GridIndex,
  col: GridIndex,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  points: Schema.NullOr(FiniteNumber),
  conditionKind: BingoTileConditionKindSchema,
  condition: BingoTileConditionSchema,
  lockedByMemberId: Schema.NullOr(FiniteNumber),
  lockedByMember: Schema.NullOr(BingoMemberSummary),
  lockedAt: Schema.NullOr(DateTimeString),
  completedByCount: FiniteNumber,
  viewerProgress: Schema.NullOr(BingoTileProgressEntry),
});

export type BingoTileResponse = typeof BingoTileResponse.Type;

export const BingoLeaderboardEntry = Schema.Struct({
  rank: FiniteNumber,
  member: BingoMemberSummary,
  completedTileIds: Schema.Array(Schema.String),
  completedTileCount: FiniteNumber,
  completedLines: Schema.Array(BingoLineIdSchema),
  tilePoints: FiniteNumber,
  linePoints: FiniteNumber,
  firstCompleterPoints: FiniteNumber,
  blackoutPoints: FiniteNumber,
  totalPoints: FiniteNumber,
  isBlackout: Schema.Boolean,
  lastCompletedAt: Schema.NullOr(DateTimeString),
});

export type BingoLeaderboardEntry = typeof BingoLeaderboardEntry.Type;

export const BingoActivityEntry = Schema.Struct({
  id: Schema.String,
  boardId: Schema.String,
  tileId: Schema.String,
  tileTitle: Schema.String,
  row: GridIndex,
  col: GridIndex,
  member: BingoMemberSummary,
  sourceKind: BingoTileConditionKindSchema,
  delta: FiniteNumber,
  previousCount: FiniteNumber,
  newCount: FiniteNumber,
  completedTile: Schema.Boolean,
  completedLineCount: FiniteNumber,
  summary: Schema.String,
  occurredAt: DateTimeString,
});

export type BingoActivityEntry = typeof BingoActivityEntry.Type;

export const BingoBoardSummaryResponse = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  world: Schema.NullOr(Schema.String),
  mode: BingoBoardModeSchema,
  size: BingoBoardSizeSchema,
  status: BingoBoardStatusSchema,
  pointsPerTile: FiniteNumber,
  pointsPerLine: FiniteNumber,
  firstCompleterBonus: FiniteNumber,
  blackoutBonus: FiniteNumber,
  startsAt: Schema.NullOr(DateTimeString),
  endsAt: Schema.NullOr(DateTimeString),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  configuredTileCount: FiniteNumber,
  participantCount: FiniteNumber,
  viewerCompletedTiles: FiniteNumber,
  viewerCompletedLines: FiniteNumber,
  viewerTotalPoints: FiniteNumber,
}).annotate({ identifier: "BingoBoardSummaryResponseDto" });

export type BingoBoardSummaryResponse = typeof BingoBoardSummaryResponse.Type;

export const BingoBoardListResponse = Schema.Struct({
  items: Schema.Array(BingoBoardSummaryResponse),
}).annotate({ identifier: "BingoBoardListResponseDto" });

export type BingoBoardListResponse = typeof BingoBoardListResponse.Type;

export const BingoBoardDetailResponse = Schema.Struct({
  board: BingoBoardSummaryResponse,
  viewerMemberId: FiniteNumber,
  tiles: Schema.Array(BingoTileResponse),
  memberProgress: Schema.Array(BingoTileProgressEntry),
  leaderboard: Schema.Array(BingoLeaderboardEntry),
  recentActivity: Schema.Array(BingoActivityEntry),
}).annotate({ identifier: "BingoBoardDetailResponseDto" });

export type BingoBoardDetailResponse = typeof BingoBoardDetailResponse.Type;

export const BingoTileInput = Schema.Struct({
  row: GridIndex,
  col: GridIndex,
  title: TileTitle,
  description: Schema.optionalKey(TileDescription),
  points: Schema.optionalKey(Schema.NullOr(NonNegativeScore)),
  condition: BingoTileConditionSchema,
});

export type BingoTileInput = typeof BingoTileInput.Type;

export const CreateBingoBoardRequest = Schema.Struct({
  name: BoardName,
  description: Schema.optionalKey(BoardDescription),
  world: Schema.optionalKey(
    Schema.NullOr(Schema.String.check(Schema.isMaxLength(64))),
  ),
  mode: Schema.optionalKey(BingoBoardModeSchema),
  size: Schema.optionalKey(BingoBoardSizeSchema),
  pointsPerTile: Schema.optionalKey(NonNegativeScore),
  pointsPerLine: Schema.optionalKey(NonNegativeScore),
  firstCompleterBonus: Schema.optionalKey(NonNegativeScore),
  blackoutBonus: Schema.optionalKey(NonNegativeScore),
  startsAt: Schema.optionalKey(Schema.NullOr(DateTimeString)),
  endsAt: Schema.optionalKey(Schema.NullOr(DateTimeString)),
  populateStarterTiles: Schema.optionalKey(Schema.Boolean),
  tiles: Schema.optionalKey(Schema.Array(BingoTileInput)),
}).annotate({ identifier: "CreateBingoBoardDto" });

export type CreateBingoBoardRequest = typeof CreateBingoBoardRequest.Type;

export const UpdateBingoBoardRequest = Schema.Struct({
  name: Schema.optionalKey(BoardName),
  description: Schema.optionalKey(BoardDescription),
  world: Schema.optionalKey(
    Schema.NullOr(Schema.String.check(Schema.isMaxLength(64))),
  ),
  mode: Schema.optionalKey(BingoBoardModeSchema),
  size: Schema.optionalKey(BingoBoardSizeSchema),
  status: Schema.optionalKey(BingoBoardStatusSchema),
  pointsPerTile: Schema.optionalKey(NonNegativeScore),
  pointsPerLine: Schema.optionalKey(NonNegativeScore),
  firstCompleterBonus: Schema.optionalKey(NonNegativeScore),
  blackoutBonus: Schema.optionalKey(NonNegativeScore),
  startsAt: Schema.optionalKey(Schema.NullOr(DateTimeString)),
  endsAt: Schema.optionalKey(Schema.NullOr(DateTimeString)),
}).annotate({ identifier: "UpdateBingoBoardDto" });

export type UpdateBingoBoardRequest = typeof UpdateBingoBoardRequest.Type;

export const ReplaceBingoTilesRequest = Schema.Struct({
  tiles: Schema.Array(BingoTileInput),
}).annotate({ identifier: "ReplaceBingoTilesDto" });

export type ReplaceBingoTilesRequest = typeof ReplaceBingoTilesRequest.Type;

export const UpdateBingoTileProgressRequest = Schema.Struct({
  memberId: Schema.Int.check(Schema.isGreaterThan(0)),
  currentCount: Schema.optionalKey(
    Schema.Int.check(
      Schema.isGreaterThanOrEqualTo(0),
      Schema.isLessThanOrEqualTo(100_000),
    ),
  ),
  completed: Schema.optionalKey(Schema.Boolean),
  note: Schema.optionalKey(
    Schema.NullOr(Schema.String.check(Schema.isMaxLength(200))),
  ),
}).annotate({ identifier: "UpdateBingoTileProgressDto" });

export type UpdateBingoTileProgressRequest =
  typeof UpdateBingoTileProgressRequest.Type;

export const BingoMutationResponse = Schema.Struct({
  ok: Schema.Boolean,
}).annotate({ identifier: "BingoMutationResponseDto" });

export type BingoMutationResponse = typeof BingoMutationResponse.Type;
