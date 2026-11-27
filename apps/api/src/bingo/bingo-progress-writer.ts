import {
  calculateMemberBingoScore,
  isBingoTileLockedForMember,
} from "@lootlog/domain/bingo";
import {
  BingoBoardMode,
  type BingoMilestoneNotificationEvent,
  type BingoRealtimeUpdate,
  type BingoTileConditionKind,
} from "@lootlog/schema/bingo";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  bingoBoardTable,
  bingoMilestoneOutboxTable,
  bingoProgressEventTable,
  bingoTileProgressTable,
  bingoTileTable,
} from "#src/database/drizzle/bingo.schema";
import type { JsonValue } from "#src/database/json";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { Effect } from "effect";

type Database = typeof ApiDatabase.Service;

export type BingoTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export type BingoBoardRow = typeof bingoBoardTable.$inferSelect;

export type BingoTileRow = typeof bingoTileTable.$inferSelect;

export type ApplyTileProgressInput = {
  readonly board: BingoBoardRow;
  readonly boardTiles: ReadonlyArray<BingoTileRow>;
  readonly tile: BingoTileRow;
  readonly memberId: number;
  readonly memberName: string;
  readonly sourceKind: BingoTileConditionKind;
  readonly dedupKey: string;
  readonly mode:
    | { readonly kind: "delta"; readonly delta: number }
    | {
        readonly kind: "absolute";
        readonly nextCount: number;
        readonly forceCompleted?: boolean;
        readonly manualOverride?: boolean;
      };
  readonly summary: string;
  readonly metadata?: JsonValue;
  readonly occurredAt: Date;
};

export type ApplyTileProgressOutcome = {
  readonly applied: boolean;
  readonly realtimeUpdate?: BingoRealtimeUpdate;
  readonly milestoneQueued?: boolean;
};

export const lockBingoBoardForProgress = Effect.fn(
  "bingo.lockBoardForProgress",
)(function* (transaction: BingoTransaction, boardId: string) {
  const [board] = yield* transaction
    .select()
    .from(bingoBoardTable)
    .where(eq(bingoBoardTable.id, boardId))
    .limit(1)
    .for("update");

  if (!board) return null;

  const tiles = yield* transaction
    .select()
    .from(bingoTileTable)
    .where(eq(bingoTileTable.boardId, boardId))
    .orderBy(asc(bingoTileTable.row), asc(bingoTileTable.col));

  return { board, tiles };
});

const computeNextProgressState = (
  mode: ApplyTileProgressInput["mode"],
  previousCount: number,
  targetCount: number,
) => {
  if (mode.kind === "delta") {
    const nextCount = Math.max(
      0,
      Math.min(targetCount, previousCount + mode.delta),
    );

    return { nextCount, willBeCompleted: nextCount >= targetCount };
  }

  let nextCount = Math.max(0, Math.min(targetCount, mode.nextCount));

  const willBeCompleted =
    mode.forceCompleted !== undefined
      ? mode.forceCompleted
      : nextCount >= targetCount;

  if (mode.forceCompleted === true && nextCount < targetCount) {
    nextCount = targetCount;
  }

  if (mode.forceCompleted === false && nextCount >= targetCount) {
    nextCount = Math.max(0, targetCount - 1);
  }

  return { nextCount, willBeCompleted };
};

const resolveCompletionOutcome = (options: {
  readonly input: ApplyTileProgressInput;
  readonly eventId: string;
  readonly lockedTileByThisMember: boolean;
  readonly memberCompletedRows: ReadonlyArray<{
    readonly tileId: string;
    readonly completedAt: Date | null;
  }>;
}) => {
  const { input, eventId, lockedTileByThisMember, memberCompletedRows } =
    options;

  const { board, tile, memberId, memberName } = input;

  const tileMap = new Map(
    input.boardTiles.map((boardTile) => [
      boardTile.id,
      boardTile.id === tile.id && lockedTileByThisMember
        ? { ...boardTile, lockedByMemberId: memberId }
        : boardTile,
    ]),
  );

  const scoreBefore = calculateMemberBingoScore(
    board,
    input.boardTiles,
    memberId,
    memberCompletedRows.filter((row) => row.tileId !== tile.id),
  );

  const scoreAfter = calculateMemberBingoScore(
    board,
    [...tileMap.values()],
    memberId,
    memberCompletedRows,
  );

  const newLinesCount = Math.max(
    0,
    scoreAfter.completedLines.length - scoreBefore.completedLines.length,
  );

  const milestoneKind = scoreAfter.isBlackout
    ? "BLACKOUT"
    : newLinesCount > 0
      ? "LINE_COMPLETED"
      : "TILE_COMPLETED";

  return {
    newLinesCount,
    realtimeUpdate: {
      guildId: board.guildId,
      boardId: board.id,
      reason: newLinesCount > 0 ? "line_completed" : "tile_completed",
      memberId,
      memberName,
      tileId: tile.id,
      tileTitle: tile.title,
      completedLinesCount: scoreAfter.completedLines.length,
      blackout: scoreAfter.isBlackout,
    } satisfies BingoRealtimeUpdate,
    milestoneNotification: {
      guildId: board.guildId,
      boardId: board.id,
      boardName: board.name,
      world: board.world,
      eventId,
      milestoneKind,
      memberId,
      memberName,
      tileId: tile.id,
      tileTitle: tile.title,
      row: tile.row,
      col: tile.col,
      summary: input.summary,
      completedTileCount: scoreAfter.completedTileIds.length,
      totalTileCount: board.size * board.size,
      completedLinesCount: scoreAfter.completedLines.length,
      totalPoints: scoreAfter.totalPoints,
      occurredAt: input.occurredAt.toISOString(),
    } satisfies BingoMilestoneNotificationEvent,
  };
};

const syncTileLock = Effect.fn("bingo.syncTileLock")(function* (
  transaction: BingoTransaction,
  options: {
    readonly boardMode: BingoBoardMode;
    readonly tile: BingoTileRow;
    readonly memberId: number;
    readonly isManual: boolean;
    readonly newlyCompleted: boolean;
    readonly revokedCompletion: boolean;
    readonly occurredAt: Date;
  },
) {
  const {
    boardMode,
    tile,
    memberId,
    isManual,
    newlyCompleted,
    revokedCompletion,
    occurredAt,
  } = options;

  if (newlyCompleted && tile.lockedByMemberId === null) {
    const claimed = yield* transaction
      .update(bingoTileTable)
      .set({
        lockedByMemberId: memberId,
        lockedAt: occurredAt,
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(bingoTileTable.id, tile.id),
          isNull(bingoTileTable.lockedByMemberId),
        ),
      )
      .returning({ id: bingoTileTable.id });

    if (claimed.length > 0) {
      return { blocked: false, lockedByThisMember: true };
    }

    if (boardMode === BingoBoardMode.LOCKOUT && !isManual) {
      return { blocked: true, lockedByThisMember: false };
    }
  }

  if (revokedCompletion && tile.lockedByMemberId === memberId) {
    yield* transaction
      .update(bingoTileTable)
      .set({
        lockedByMemberId: null,
        lockedAt: null,
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(bingoTileTable.id, tile.id),
          eq(bingoTileTable.lockedByMemberId, memberId),
        ),
      );

    return { blocked: false, lockedByThisMember: false };
  }

  return {
    blocked: false,
    lockedByThisMember: tile.lockedByMemberId === memberId,
  };
});

const persistCompletion = Effect.fn("bingo.persistCompletion")(function* (
  transaction: BingoTransaction,
  options: {
    readonly input: ApplyTileProgressInput;
    readonly eventId: string;
    readonly lockedTileByThisMember: boolean;
  },
) {
  const { input, eventId, lockedTileByThisMember } = options;

  const memberCompletedRows = yield* transaction
    .select({
      tileId: bingoTileProgressTable.tileId,
      completedAt: bingoTileProgressTable.completedAt,
    })
    .from(bingoTileProgressTable)
    .where(
      and(
        eq(bingoTileProgressTable.boardId, input.board.id),
        eq(bingoTileProgressTable.memberId, input.memberId),
        isNotNull(bingoTileProgressTable.completedAt),
      ),
    );

  const { newLinesCount, realtimeUpdate, milestoneNotification } =
    resolveCompletionOutcome({
      input,
      eventId,
      lockedTileByThisMember,
      memberCompletedRows,
    });

  if (newLinesCount > 0) {
    yield* transaction
      .update(bingoProgressEventTable)
      .set({ completedLineCount: newLinesCount })
      .where(eq(bingoProgressEventTable.id, eventId));
  }

  yield* transaction.insert(bingoMilestoneOutboxTable).values({
    guildId: input.board.guildId,
    event: milestoneNotification,
  });

  return {
    applied: true,
    realtimeUpdate,
    milestoneQueued: true,
  } satisfies ApplyTileProgressOutcome;
});

const insertProgressEvent = (
  transaction: BingoTransaction,
  input: ApplyTileProgressInput,
  eventId: string,
  stats: {
    readonly delta: number;
    readonly previousCount: number;
    readonly nextCount: number;
    readonly newlyCompleted: boolean;
  },
) =>
  transaction.insert(bingoProgressEventTable).values({
    id: eventId,
    boardId: input.board.id,
    tileId: input.tile.id,
    memberId: input.memberId,
    sourceKind: input.sourceKind,
    dedupKey: input.dedupKey,
    delta: stats.delta,
    previousCount: stats.previousCount,
    newCount: stats.nextCount,
    completedTile: stats.newlyCompleted,
    completedLineCount: 0,
    summary: input.summary,
    metadata: input.metadata ?? null,
    occurredAt: input.occurredAt,
  });

const hasRecordedSource = (
  transaction: BingoTransaction,
  input: ApplyTileProgressInput,
) =>
  transaction
    .select({ id: bingoProgressEventTable.id })
    .from(bingoProgressEventTable)
    .where(
      and(
        eq(bingoProgressEventTable.tileId, input.tile.id),
        eq(bingoProgressEventTable.memberId, input.memberId),
        eq(bingoProgressEventTable.dedupKey, input.dedupKey),
      ),
    )
    .limit(1)
    .pipe(Effect.map((rows) => rows.length > 0));

const readTileProgress = (
  transaction: BingoTransaction,
  tileId: string,
  memberId: number,
) =>
  transaction
    .select()
    .from(bingoTileProgressTable)
    .where(
      and(
        eq(bingoTileProgressTable.tileId, tileId),
        eq(bingoTileProgressTable.memberId, memberId),
      ),
    )
    .limit(1)
    .pipe(Effect.map((rows) => rows[0] ?? null));

const upsertTileProgress = (
  transaction: BingoTransaction,
  input: ApplyTileProgressInput,
  progress: {
    readonly currentCount: number;
    readonly targetCount: number;
    readonly completedAt: Date | null;
    readonly manualOverride: boolean;
  },
) =>
  transaction
    .insert(bingoTileProgressTable)
    .values({
      boardId: input.board.id,
      tileId: input.tile.id,
      memberId: input.memberId,
      ...progress,
      updatedAt: input.occurredAt,
    })
    .onConflictDoUpdate({
      target: [bingoTileProgressTable.tileId, bingoTileProgressTable.memberId],
      set: { ...progress, updatedAt: input.occurredAt },
    });

const NOT_APPLIED: ApplyTileProgressOutcome = { applied: false };

export const applyBingoTileProgress = Effect.fn("bingo.applyTileProgress")(
  function* (transaction: BingoTransaction, input: ApplyTileProgressInput) {
    const { board, tile, memberId, memberName } = input;

    const isManual =
      input.mode.kind === "absolute" && Boolean(input.mode.manualOverride);

    if (!isManual && isBingoTileLockedForMember(board.mode, tile, memberId)) {
      return NOT_APPLIED;
    }

    if (yield* hasRecordedSource(transaction, input)) {
      return NOT_APPLIED;
    }

    const existing = yield* readTileProgress(transaction, tile.id, memberId);
    const targetCount = tile.condition.targetCount;
    const previousCount = existing?.currentCount ?? 0;
    const wasCompleted = existing !== null && existing.completedAt !== null;

    if (!isManual && wasCompleted) {
      return NOT_APPLIED;
    }

    const { nextCount, willBeCompleted } = computeNextProgressState(
      input.mode,
      previousCount,
      targetCount,
    );

    const delta = nextCount - previousCount;

    if (!isManual && delta === 0 && willBeCompleted === wasCompleted) {
      return NOT_APPLIED;
    }

    const newlyCompleted = !wasCompleted && willBeCompleted;

    const lockResult = yield* syncTileLock(transaction, {
      boardMode: board.mode,
      tile,
      memberId,
      isManual,
      newlyCompleted,
      revokedCompletion: wasCompleted && !willBeCompleted,
      occurredAt: input.occurredAt,
    });

    if (lockResult.blocked) {
      return NOT_APPLIED;
    }

    const eventId = Bun.randomUUIDv7();

    yield* insertProgressEvent(transaction, input, eventId, {
      delta,
      previousCount,
      nextCount,
      newlyCompleted,
    });

    yield* upsertTileProgress(transaction, input, {
      currentCount: nextCount,
      targetCount,
      completedAt: willBeCompleted
        ? (existing?.completedAt ?? input.occurredAt)
        : null,
      manualOverride: isManual,
    });

    if (!newlyCompleted) {
      const outcome: ApplyTileProgressOutcome = {
        applied: true,
        realtimeUpdate: {
          guildId: board.guildId,
          boardId: board.id,
          reason: "tile_progress",
          memberId,
          memberName,
          tileId: tile.id,
          tileTitle: tile.title,
        },
      };

      return outcome;
    }

    const completionOutcome: ApplyTileProgressOutcome =
      yield* persistCompletion(transaction, {
        input,
        eventId,
        lockedTileByThisMember: lockResult.lockedByThisMember,
      });

    return completionOutcome;
  },
);
