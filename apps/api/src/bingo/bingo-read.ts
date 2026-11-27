import { adapterOperation } from "@lootlog/instrumentation/operation";
import {
  AccessRequirement,
  createAccessPolicy,
} from "@lootlog/domain/access-policy";
import { calculateMemberBingoScore } from "@lootlog/domain/bingo";
import { canViewLoot } from "@lootlog/domain/loot-visibility";
import { canReadHeroSighting } from "@lootlog/domain/npc-permissions";
import { BingoTileConditionKind } from "@lootlog/schema/bingo";
import type { Capability } from "@lootlog/schema/permissions";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import type {
  BingoActivityEntry,
  BingoBoardDetailResponse,
  BingoBoardListResponse,
  BingoBoardSummaryResponse,
  BingoLeaderboardEntry,
  BingoMemberSummary,
  BingoTileProgressEntry,
  BingoTileResponse,
} from "#src/contracts/bingo/schemas";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  bingoBoardTable,
  bingoProgressEventTable,
  bingoTileProgressTable,
  bingoTileTable,
} from "#src/database/drizzle/bingo.schema";
import {
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { toLootVisibilityRoles } from "#src/loots/loot-visibility";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Effect, Option, Schema } from "effect";
import { groupBy } from "es-toolkit";
import type { BingoBoardRow, BingoTileRow } from "./bingo-progress-writer.js";

const RECENT_ACTIVITY_LIMIT = 40;

export type BingoViewer = {
  readonly discordId: string;
  readonly permissions: ReadonlyArray<Capability>;
};

type ViewerRole = Pick<
  typeof roleTable.$inferSelect,
  "id" | "permissions" | "lvlRangeFrom" | "lvlRangeTo"
>;

const decodeSourceNpcs = Schema.decodeUnknownOption(
  Schema.Struct({
    npcs: Schema.Array(
      Schema.Struct({
        type: Schema.NullOr(Schema.String),
        lvl: Schema.NullOr(Schema.Finite),
      }),
    ),
  }),
);

const canViewActivitySource = (
  row: typeof bingoProgressEventTable.$inferSelect,
  viewer: BingoViewer,
  roles: ReadonlyArray<ViewerRole>,
): boolean => {
  if (
    row.sourceKind !== BingoTileConditionKind.LOOT &&
    row.sourceKind !== BingoTileConditionKind.KILL &&
    row.sourceKind !== BingoTileConditionKind.HERO_SIGHTING
  ) {
    return true;
  }

  const npcs = Option.match(decodeSourceNpcs(row.metadata), {
    onNone: () => [],
    onSome: (metadata) => metadata.npcs,
  });

  if (row.sourceKind === BingoTileConditionKind.HERO_SIGHTING) {
    return (
      createAccessPolicy({ capabilities: viewer.permissions }).allowsAny(
        AccessRequirement.ADMINISTER,
      ) ||
      (npcs.length > 0 &&
        npcs.every(
          ({ lvl }) => lvl !== null && canReadHeroSighting(roles, lvl),
        ))
    );
  }

  return canViewLoot({
    permissions: viewer.permissions,
    roles: toLootVisibilityRoles(roles),
    npcs: npcs.map(({ type, lvl }) => ({ type, level: lvl })),
  });
};

type MemberRow = Pick<
  typeof memberTable.$inferSelect,
  "id" | "userId" | "name" | "avatar"
>;

const toMemberSummary = (member: MemberRow): BingoMemberSummary => ({
  id: member.id,
  userId: member.userId,
  name: member.name,
  avatar: member.avatar,
});

const toProgressEntry = (
  row: typeof bingoTileProgressTable.$inferSelect,
): BingoTileProgressEntry => ({
  tileId: row.tileId,
  memberId: row.memberId,
  currentCount: row.currentCount,
  targetCount: row.targetCount,
  completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  manualOverride: row.manualOverride,
  updatedAt: row.updatedAt.toISOString(),
});

const toBoardSummary = (
  board: BingoBoardRow,
  stats: {
    readonly configuredTileCount: number;
    readonly participantCount: number;
    readonly viewerCompletedTiles: number;
    readonly viewerCompletedLines: number;
    readonly viewerTotalPoints: number;
  },
): BingoBoardSummaryResponse => ({
  id: board.id,
  guildId: board.guildId,
  name: board.name,
  description: board.description,
  world: board.world,
  mode: board.mode,
  size: board.size,
  status: board.status,
  pointsPerTile: board.pointsPerTile,
  pointsPerLine: board.pointsPerLine,
  firstCompleterBonus: board.firstCompleterBonus,
  blackoutBonus: board.blackoutBonus,
  startsAt: board.startsAt ? board.startsAt.toISOString() : null,
  endsAt: board.endsAt ? board.endsAt.toISOString() : null,
  createdAt: board.createdAt.toISOString(),
  updatedAt: board.updatedAt.toISOString(),
  ...stats,
});

const compareLeaderboard = (
  left: Omit<BingoLeaderboardEntry, "rank">,
  right: Omit<BingoLeaderboardEntry, "rank">,
): number => {
  if (right.totalPoints !== left.totalPoints) {
    return right.totalPoints - left.totalPoints;
  }

  if (right.completedLines.length !== left.completedLines.length) {
    return right.completedLines.length - left.completedLines.length;
  }

  if (right.completedTileCount !== left.completedTileCount) {
    return right.completedTileCount - left.completedTileCount;
  }

  if (left.lastCompletedAt && right.lastCompletedAt) {
    return Date.parse(left.lastCompletedAt) - Date.parse(right.lastCompletedAt);
  }

  return left.member.name.localeCompare(right.member.name);
};

const buildBoardDetailData = (options: {
  readonly board: BingoBoardRow;
  readonly viewer: MemberRow | null;
  readonly tiles: ReadonlyArray<BingoTileRow>;
  readonly progressRows: ReadonlyArray<
    typeof bingoTileProgressTable.$inferSelect
  >;
  readonly activityRows: ReadonlyArray<
    typeof bingoProgressEventTable.$inferSelect
  >;
  readonly members: ReadonlyArray<MemberRow>;
}): BingoBoardDetailResponse => {
  const { board, viewer, tiles, progressRows, activityRows, members } = options;
  const memberById = new Map(members.map((member) => [member.id, member]));
  const tileById = new Map(tiles.map((tile) => [tile.id, tile]));
  const progressByMember = groupBy(progressRows, (row) => row.memberId);
  const completedCountByTile = new Map<string, number>();

  for (const row of progressRows) {
    if (row.completedAt !== null) {
      completedCountByTile.set(
        row.tileId,
        (completedCountByTile.get(row.tileId) ?? 0) + 1,
      );
    }
  }

  const viewerProgressByTile = new Map<string, BingoTileProgressEntry>();

  if (viewer) {
    for (const row of progressByMember[viewer.id] ?? []) {
      viewerProgressByTile.set(row.tileId, toProgressEntry(row));
    }
  }

  const leaderboard: BingoLeaderboardEntry[] = Object.entries(progressByMember)
    .flatMap(([memberIdKey, rows]) => {
      const memberId = Number(memberIdKey);
      const member = memberById.get(memberId);

      if (!member || !rows) return [];

      const score = calculateMemberBingoScore(board, tiles, memberId, rows);

      return [
        {
          member: toMemberSummary(member),
          completedTileIds: score.completedTileIds,
          completedTileCount: score.completedTileIds.length,
          completedLines: score.completedLines,
          tilePoints: score.tilePoints,
          linePoints: score.linePoints,
          firstCompleterPoints: score.firstCompleterPoints,
          blackoutPoints: score.blackoutPoints,
          totalPoints: score.totalPoints,
          isBlackout: score.isBlackout,
          lastCompletedAt: score.lastCompletedAt,
        },
      ];
    })
    .toSorted(compareLeaderboard)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const viewerLeaderboardEntry = viewer
    ? (leaderboard.find((entry) => entry.member.id === viewer.id) ?? null)
    : null;

  const tileResponses: BingoTileResponse[] = tiles.map((tile) => {
    const lockedBy =
      tile.lockedByMemberId !== null
        ? (memberById.get(tile.lockedByMemberId) ?? null)
        : null;

    return {
      id: tile.id,
      boardId: tile.boardId,
      row: tile.row,
      col: tile.col,
      title: tile.title,
      description: tile.description,
      points: tile.points,
      conditionKind: tile.conditionKind,
      condition: tile.condition,
      lockedByMemberId: tile.lockedByMemberId,
      lockedByMember: lockedBy ? toMemberSummary(lockedBy) : null,
      lockedAt: tile.lockedAt ? tile.lockedAt.toISOString() : null,
      completedByCount: completedCountByTile.get(tile.id) ?? 0,
      viewerProgress: viewerProgressByTile.get(tile.id) ?? null,
    };
  });

  const recentActivity: BingoActivityEntry[] = activityRows.flatMap((row) => {
    const tile = tileById.get(row.tileId);
    const member = memberById.get(row.memberId);

    if (!tile || !member) return [];

    return [
      {
        id: row.id,
        boardId: row.boardId,
        tileId: row.tileId,
        tileTitle: tile.title,
        row: tile.row,
        col: tile.col,
        member: toMemberSummary(member),
        sourceKind: row.sourceKind,
        delta: row.delta,
        previousCount: row.previousCount,
        newCount: row.newCount,
        completedTile: row.completedTile,
        completedLineCount: row.completedLineCount,
        summary: row.summary,
        occurredAt: row.occurredAt.toISOString(),
      },
    ];
  });

  return {
    board: toBoardSummary(board, {
      configuredTileCount: tiles.length,
      participantCount: leaderboard.length,
      viewerCompletedTiles: viewerLeaderboardEntry?.completedTileCount ?? 0,
      viewerCompletedLines: viewerLeaderboardEntry?.completedLines.length ?? 0,
      viewerTotalPoints: viewerLeaderboardEntry?.totalPoints ?? 0,
    }),
    viewerMemberId: viewer?.id ?? 0,
    tiles: tileResponses,
    memberProgress: progressRows.map(toProgressEntry),
    leaderboard,
    recentActivity,
  };
};

const query = adapterOperation("bingo.drizzle");

export const findBingoViewerMember = (
  database: typeof ApiDatabase.Service,
  guildId: string,
  discordId: string,
) =>
  query(
    "bingo.viewerMember",
    database
      .select({
        id: memberTable.id,
        userId: memberTable.userId,
        name: memberTable.name,
        avatar: memberTable.avatar,
      })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.guildId, guildId),
          eq(memberTable.userId, discordId),
        ),
      )
      .limit(1),
  ).pipe(Effect.map((rows) => rows[0] ?? null));

export const requireBingoBoard = (
  database: typeof ApiDatabase.Service,
  guildId: string,
  boardId: string,
) =>
  query(
    "bingo.findBoard",
    database
      .select()
      .from(bingoBoardTable)
      .where(
        and(
          eq(bingoBoardTable.guildId, guildId),
          eq(bingoBoardTable.id, boardId),
        ),
      )
      .limit(1),
  ).pipe(
    Effect.flatMap((rows) =>
      rows[0]
        ? Effect.succeed(rows[0])
        : Effect.fail(new ResourceNotFoundError("Bingo board not found")),
    ),
  );

export const listBingoBoards = Effect.fn("bingo.listBoards")(function* (
  database: typeof ApiDatabase.Service,
  guildId: string,
  bingoViewer: BingoViewer,
) {
  const viewer = yield* findBingoViewerMember(
    database,
    guildId,
    bingoViewer.discordId,
  );

  const boards = yield* query(
    "bingo.listBoards",
    database
      .select()
      .from(bingoBoardTable)
      .where(eq(bingoBoardTable.guildId, guildId))
      .orderBy(desc(bingoBoardTable.updatedAt)),
  );

  if (boards.length === 0) {
    return { items: [] } satisfies BingoBoardListResponse;
  }

  const boardIds = boards.map((board) => board.id);

  const [allTiles, allProgress] = yield* Effect.all(
    [
      query(
        "bingo.listBoards.tiles",
        database
          .select()
          .from(bingoTileTable)
          .where(inArray(bingoTileTable.boardId, boardIds)),
      ),
      query(
        "bingo.listBoards.progress",
        database
          .select()
          .from(bingoTileProgressTable)
          .where(inArray(bingoTileProgressTable.boardId, boardIds)),
      ),
    ],
    { concurrency: 2 },
  );

  const tilesByBoard = groupBy(allTiles, (tile) => tile.boardId);

  const progressByBoard = groupBy(allProgress, (progress) => progress.boardId);

  const items = boards.map((board) => {
    const boardTiles = tilesByBoard[board.id] ?? [];
    const boardProgress = progressByBoard[board.id] ?? [];
    const participants = new Set(boardProgress.map((row) => row.memberId));

    const viewerProgress = viewer
      ? boardProgress.filter((row) => row.memberId === viewer.id)
      : [];

    const viewerScore = viewer
      ? calculateMemberBingoScore(board, boardTiles, viewer.id, viewerProgress)
      : null;

    return toBoardSummary(board, {
      configuredTileCount: boardTiles.length,
      participantCount: participants.size,
      viewerCompletedTiles: viewerScore?.completedTileIds.length ?? 0,
      viewerCompletedLines: viewerScore?.completedLines.length ?? 0,
      viewerTotalPoints: viewerScore?.totalPoints ?? 0,
    });
  });

  return { items } satisfies BingoBoardListResponse;
});

export const getBingoBoardDetail = Effect.fn("bingo.getBoard")(function* (
  database: typeof ApiDatabase.Service,
  guildId: string,
  boardId: string,
  bingoViewer: BingoViewer,
) {
  const board = yield* requireBingoBoard(database, guildId, boardId);

  const viewer = yield* findBingoViewerMember(
    database,
    guildId,
    bingoViewer.discordId,
  );

  const viewerRoles = viewer
    ? yield* query(
        "bingo.getBoard.viewerRoles",
        database
          .select({
            id: roleTable.id,
            permissions: roleTable.permissions,
            lvlRangeFrom: roleTable.lvlRangeFrom,
            lvlRangeTo: roleTable.lvlRangeTo,
          })
          .from(memberToRoleTable)
          .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
          .where(eq(memberToRoleTable.A, viewer.id)),
      )
    : [];

  const [tiles, progressRows, activityRows] = yield* Effect.all(
    [
      query(
        "bingo.getBoard.tiles",
        database
          .select()
          .from(bingoTileTable)
          .where(eq(bingoTileTable.boardId, board.id))
          .orderBy(asc(bingoTileTable.row), asc(bingoTileTable.col)),
      ),
      query(
        "bingo.getBoard.progress",
        database
          .select()
          .from(bingoTileProgressTable)
          .where(eq(bingoTileProgressTable.boardId, board.id)),
      ),
      query(
        "bingo.getBoard.activity",
        database
          .select()
          .from(bingoProgressEventTable)
          .where(eq(bingoProgressEventTable.boardId, board.id))
          .orderBy(desc(bingoProgressEventTable.createdAt))
          .limit(RECENT_ACTIVITY_LIMIT),
      ),
    ],
    { concurrency: 3 },
  );

  const memberIds = new Set<number>();

  if (viewer) memberIds.add(viewer.id);

  for (const tile of tiles) {
    if (tile.lockedByMemberId !== null) memberIds.add(tile.lockedByMemberId);
  }

  for (const progress of progressRows) {
    memberIds.add(progress.memberId);
  }

  const visibleActivityRows = activityRows.filter((row) =>
    canViewActivitySource(row, bingoViewer, viewerRoles),
  );

  for (const activity of visibleActivityRows) {
    memberIds.add(activity.memberId);
  }

  const members =
    memberIds.size > 0
      ? yield* query(
          "bingo.getBoard.members",
          database
            .select({
              id: memberTable.id,
              userId: memberTable.userId,
              name: memberTable.name,
              avatar: memberTable.avatar,
            })
            .from(memberTable)
            .where(inArray(memberTable.id, [...memberIds])),
        )
      : [];

  return buildBoardDetailData({
    board,
    viewer,
    tiles,
    progressRows,
    activityRows: visibleActivityRows,
    members,
  });
});
