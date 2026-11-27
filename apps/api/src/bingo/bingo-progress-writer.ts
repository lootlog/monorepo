import {
  calculateMemberBingoScore,
  computeCompletedBingoLines,
} from "@lootlog/domain/bingo";
import {
  BingoBoardMode,
  type BingoMilestoneNotificationEvent,
  type BingoRealtimeUpdate,
  type BingoTileConditionKind,
} from "@lootlog/schema/bingo";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  bingoProgressEventTable,
  bingoTileProgressTable,
  bingoTileTable,
  type bingoBoardTable,
} from "#src/database/drizzle/bingo.schema";
import type { JsonValue } from "#src/database/json";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
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

type ApplyTileProgressOutcome = {
  readonly applied: boolean;
  readonly realtimeUpdate?: BingoRealtimeUpdate;
  readonly milestoneNotification?: BingoMilestoneNotificationEvent;
};

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

  const completedCoordsBefore = memberCompletedRows.flatMap((row) => {
    if (row.tileId === tile.id) return [];

    const boardTile = tileMap.get(row.tileId);

    return boardTile ? [{ row: boardTile.row, col: boardTile.col }] : [];
  });

  const linesBefore = computeCompletedBingoLines(completedCoordsBefore);

  const scoreAfter = calculateMemberBingoScore(
    {
      mode: board.mode,
      pointsPerTile: board.pointsPerTile,
      pointsPerLine: board.pointsPerLine,
      firstCompleterBonus: board.firstCompleterBonus,
      blackoutBonus: board.blackoutBonus,
    },
    [...tileMap.values()],
    memberId,
    memberCompletedRows,
  );

  const newLinesCount = Math.max(
    0,
    scoreAfter.completedLines.length - linesBefore.length,
  );

  const milestoneKind = scoreAfter.isBlackout
    ? "BLACKOUT"
    : newLinesCount > 0
      ? "LINE_COMPLETED"
      : "TILE_COMPLETED";

  return {
    newLinesCount,
    outcome: {
      applied: true,
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
      },
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
        completedLinesCount: scoreAfter.completedLines.length,
        totalPoints: scoreAfter.totalPoints,
        occurredAt: input.occurredAt.toISOString(),
      },
    } satisfies ApplyTileProgressOutcome,
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

const isBlockedByLockout = (
  board: BingoBoardRow,
  tile: BingoTileRow,
  memberId: number,
  isManual: boolean,
): boolean =>
  !isManual &&
  board.mode === BingoBoardMode.LOCKOUT &&
  tile.lockedByMemberId !== null &&
  tile.lockedByMemberId !== memberId;

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

  const { newLinesCount, outcome } = resolveCompletionOutcome({
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

  return outcome;
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
  transaction
    .insert(bingoProgressEventTable)
    .values({
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
    })
    .onConflictDoNothing({
      target: [
        bingoProgressEventTable.tileId,
        bingoProgressEventTable.memberId,
        bingoProgressEventTable.dedupKey,
      ],
    })
    .returning({ id: bingoProgressEventTable.id });

const NOT_APPLIED: ApplyTileProgressOutcome = { applied: false };

export const applyBingoTileProgress = Effect.fn("bingo.applyTileProgress")(
  function* (transaction: BingoTransaction, input: ApplyTileProgressInput) {
    const { board, tile, memberId, memberName } = input;

    const isManual =
      input.mode.kind === "absolute" && Boolean(input.mode.manualOverride);

    if (isBlockedByLockout(board, tile, memberId, isManual)) {
      return NOT_APPLIED;
    }

    const existingRows = yield* transaction
      .select()
      .from(bingoTileProgressTable)
      .where(
        and(
          eq(bingoTileProgressTable.tileId, tile.id),
          eq(bingoTileProgressTable.memberId, memberId),
        ),
      )
      .limit(1);

    const existing = existingRows[0] ?? null;
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

    const insertedEvent = yield* insertProgressEvent(
      transaction,
      input,
      eventId,
      { delta, previousCount, nextCount, newlyCompleted },
    );

    if (insertedEvent.length === 0) {
      return NOT_APPLIED;
    }

    const completedAt = willBeCompleted
      ? (existing?.completedAt ?? input.occurredAt)
      : null;

    yield* transaction
      .insert(bingoTileProgressTable)
      .values({
        boardId: board.id,
        tileId: tile.id,
        memberId,
        currentCount: nextCount,
        targetCount,
        completedAt,
        manualOverride: isManual,
        updatedAt: input.occurredAt,
      })
      .onConflictDoUpdate({
        target: [
          bingoTileProgressTable.tileId,
          bingoTileProgressTable.memberId,
        ],
        set: {
          currentCount: nextCount,
          targetCount,
          completedAt,
          manualOverride: isManual,
          updatedAt: input.occurredAt,
        },
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
