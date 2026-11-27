import { adapterOperation } from "@lootlog/instrumentation/operation";
import { buildStarterBingoTiles } from "@lootlog/domain/bingo";
import {
  BINGO_DEFAULT_BOARD_SIZE,
  BingoBoardMode,
  BingoBoardStatus,
  BingoTileConditionKind,
} from "@lootlog/schema/bingo";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import type {
  BingoTileInput,
  CreateBingoBoardRequest,
  ReplaceBingoTilesRequest,
  UpdateBingoBoardRequest,
  UpdateBingoTileProgressRequest,
} from "#src/contracts/bingo/schemas";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  bingoBoardTable,
  bingoProgressEventTable,
  bingoTileProgressTable,
  bingoTileTable,
} from "#src/database/drizzle/bingo.schema";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { and, eq, gte, inArray, or } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { isEqual } from "es-toolkit";
import {
  applyBingoTileProgress,
  lockBingoBoardForProgress,
  type BingoBoardRow,
  type BingoTileRow,
  type BingoTransaction,
} from "./bingo-progress-writer.js";
import type { BingoPublisher } from "./bingo-publisher.js";
import {
  findBingoViewerMember,
  getBingoBoardDetail,
  listBingoBoards,
  requireBingoBoard,
  type BingoViewer,
} from "./bingo-read.js";

const parseOptionalDate = (
  value: string | null | undefined,
): Date | null | undefined => {
  if (value === undefined) return undefined;

  if (value === null) return null;

  return new Date(value);
};

const validateTileCoordinates = (
  size: number,
  tiles: ReadonlyArray<BingoTileInput>,
) => {
  const seen = new Set<string>();

  for (const tile of tiles) {
    const key = `${tile.row}:${tile.col}`;

    if (tile.row >= size || tile.col >= size) {
      return Effect.fail(
        new InvalidRequestError(
          `Tile (${tile.row}, ${tile.col}) is outside the ${size}x${size} board`,
        ),
      );
    }

    if (seen.has(key)) {
      return Effect.fail(
        new InvalidRequestError(
          `Duplicate tile coordinates at (${tile.row}, ${tile.col})`,
        ),
      );
    }

    seen.add(key);
  }

  return Effect.void;
};

const hasRecordedProgress = (transaction: BingoTransaction, boardId: string) =>
  transaction
    .select({ id: bingoProgressEventTable.id })
    .from(bingoProgressEventTable)
    .where(eq(bingoProgressEventTable.boardId, boardId))
    .limit(1)
    .pipe(Effect.map((rows) => rows.length > 0));

const changesScoringWithProgress = (
  board: BingoBoardRow,
  input: UpdateBingoBoardRequest,
) =>
  (input.status === BingoBoardStatus.DRAFT &&
    board.status !== BingoBoardStatus.DRAFT) ||
  (input.mode !== undefined && input.mode !== board.mode) ||
  (input.size !== undefined && input.size !== board.size);

const lockGuildBoard = Effect.fn("bingo.lockGuildBoard")(function* (
  transaction: BingoTransaction,
  guildId: string,
  boardId: string,
) {
  const locked = yield* lockBingoBoardForProgress(transaction, boardId);

  if (!locked || locked.board.guildId !== guildId) {
    return yield* new ResourceNotFoundError("Bingo board not found");
  }

  return locked;
});

export const makeBingoService = (
  database: typeof ApiDatabase.Service,
  publisher: BingoPublisher,
) => {
  const query = adapterOperation("bingo.drizzle");

  const createBoard = Effect.fn("bingo.createBoard")(function* (
    guildId: string,
    viewer: BingoViewer,
    input: CreateBingoBoardRequest,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const creator = yield* findBingoViewerMember(
      database,
      guildId,
      viewer.discordId,
    );

    const boardId = Bun.randomUUIDv7();

    const size = input.size ?? BINGO_DEFAULT_BOARD_SIZE;

    const initialTiles: ReadonlyArray<BingoTileInput> =
      input.tiles !== undefined
        ? input.tiles
        : input.populateStarterTiles !== false
          ? buildStarterBingoTiles(size)
          : [];

    yield* validateTileCoordinates(size, initialTiles);

    const world = input.world?.trim() ? input.world.trim() : null;

    yield* query(
      "bingo.createBoard",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction.insert(bingoBoardTable).values({
            id: boardId,
            guildId,
            name: input.name.trim(),
            description: input.description ?? null,
            world,
            mode: input.mode ?? BingoBoardMode.RACE,
            size,
            status: BingoBoardStatus.DRAFT,
            pointsPerTile: input.pointsPerTile ?? 1,
            pointsPerLine: input.pointsPerLine ?? 5,
            firstCompleterBonus: input.firstCompleterBonus ?? 0,
            blackoutBonus: input.blackoutBonus ?? 10,
            startsAt: parseOptionalDate(input.startsAt) ?? null,
            endsAt: parseOptionalDate(input.endsAt) ?? null,
            createdByMemberId: creator?.id ?? null,
            createdAt: now,
            updatedAt: now,
          });

          if (initialTiles.length > 0) {
            yield* transaction.insert(bingoTileTable).values(
              initialTiles.map((tile) => ({
                id: Bun.randomUUIDv7(),
                boardId,
                row: tile.row,
                col: tile.col,
                title: tile.title.trim(),
                description: tile.description ?? null,
                points: tile.points ?? null,
                conditionKind: tile.condition.kind,
                condition: tile.condition,
                createdAt: now,
                updatedAt: now,
              })),
            );
          }
        }),
      ),
    );

    yield* publisher.publishRealtimeUpdate({
      guildId,
      boardId,
      reason: "board_created",
    });

    return yield* getBingoBoardDetail(database, guildId, boardId, viewer);
  });

  const updateBoard = Effect.fn("bingo.updateBoard")(function* (
    guildId: string,
    boardId: string,
    viewer: BingoViewer,
    input: UpdateBingoBoardRequest,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const patch: Partial<typeof bingoBoardTable.$inferInsert> = {
      updatedAt: now,
    };

    if (input.name !== undefined) patch.name = input.name.trim();

    if (input.description !== undefined) patch.description = input.description;

    if (input.world !== undefined) {
      patch.world = input.world?.trim() ? input.world.trim() : null;
    }

    if (input.mode !== undefined) patch.mode = input.mode;

    if (input.size !== undefined) patch.size = input.size;

    if (input.status !== undefined) patch.status = input.status;

    if (input.pointsPerTile !== undefined) {
      patch.pointsPerTile = input.pointsPerTile;
    }

    if (input.pointsPerLine !== undefined) {
      patch.pointsPerLine = input.pointsPerLine;
    }

    if (input.firstCompleterBonus !== undefined) {
      patch.firstCompleterBonus = input.firstCompleterBonus;
    }

    if (input.blackoutBonus !== undefined) {
      patch.blackoutBonus = input.blackoutBonus;
    }

    if (input.startsAt !== undefined) {
      patch.startsAt = parseOptionalDate(input.startsAt) ?? null;
    }

    if (input.endsAt !== undefined) {
      patch.endsAt = parseOptionalDate(input.endsAt) ?? null;
    }

    yield* query(
      "bingo.updateBoard",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const { board } = yield* lockGuildBoard(
            transaction,
            guildId,
            boardId,
          );

          if (
            changesScoringWithProgress(board, input) &&
            (yield* hasRecordedProgress(transaction, boardId))
          ) {
            return yield* new InvalidRequestError(
              "Board size, mode and draft status cannot change after progress was recorded",
            );
          }

          if (input.size !== undefined && input.size < board.size) {
            yield* transaction
              .delete(bingoTileTable)
              .where(
                and(
                  eq(bingoTileTable.boardId, boardId),
                  or(
                    gte(bingoTileTable.row, input.size),
                    gte(bingoTileTable.col, input.size),
                  ),
                ),
              );
          }

          yield* transaction
            .update(bingoBoardTable)
            .set(patch)
            .where(eq(bingoBoardTable.id, boardId));
        }),
      ),
    );

    yield* publisher.publishRealtimeUpdate({
      guildId,
      boardId,
      reason: "board_updated",
    });

    const detail = yield* getBingoBoardDetail(
      database,
      guildId,
      boardId,
      viewer,
    );

    return detail.board;
  });

  const deleteBoard = Effect.fn("bingo.deleteBoard")(function* (
    guildId: string,
    boardId: string,
  ) {
    yield* requireBingoBoard(database, guildId, boardId);

    yield* query(
      "bingo.deleteBoard",
      database
        .delete(bingoBoardTable)
        .where(
          and(
            eq(bingoBoardTable.guildId, guildId),
            eq(bingoBoardTable.id, boardId),
          ),
        ),
    );

    yield* publisher.publishRealtimeUpdate({
      guildId,
      boardId,
      reason: "board_deleted",
    });

    return { ok: true };
  });

  const replaceTiles = Effect.fn("bingo.replaceTiles")(function* (
    guildId: string,
    boardId: string,
    viewer: BingoViewer,
    input: ReplaceBingoTilesRequest,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    yield* query(
      "bingo.replaceTiles",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const { board, tiles: existingTiles } = yield* lockGuildBoard(
            transaction,
            guildId,
            boardId,
          );

          yield* validateTileCoordinates(board.size, input.tiles);

          const existingByCoord = new Map<string, BingoTileRow>(
            existingTiles.map((tile) => [`${tile.row}:${tile.col}`, tile]),
          );

          const incomingCoords = new Set(
            input.tiles.map((tile) => `${tile.row}:${tile.col}`),
          );

          const toDeleteIds = existingTiles.flatMap((tile) =>
            incomingCoords.has(`${tile.row}:${tile.col}`) ? [] : [tile.id],
          );

          if (toDeleteIds.length > 0) {
            yield* transaction
              .delete(bingoTileTable)
              .where(inArray(bingoTileTable.id, toDeleteIds));
          }

          for (const tile of input.tiles) {
            const key = `${tile.row}:${tile.col}`;
            const current = existingByCoord.get(key);

            if (current) {
              const conditionChanged = !isEqual(
                current.condition,
                tile.condition,
              );

              yield* transaction
                .update(bingoTileTable)
                .set({
                  title: tile.title.trim(),
                  description: tile.description ?? null,
                  points: tile.points ?? null,
                  conditionKind: tile.condition.kind,
                  condition: tile.condition,
                  ...(conditionChanged && {
                    lockedByMemberId: null,
                    lockedAt: null,
                  }),
                  updatedAt: now,
                })
                .where(eq(bingoTileTable.id, current.id));

              if (conditionChanged) {
                yield* transaction
                  .delete(bingoTileProgressTable)
                  .where(eq(bingoTileProgressTable.tileId, current.id));
              }
            } else {
              yield* transaction.insert(bingoTileTable).values({
                id: Bun.randomUUIDv7(),
                boardId,
                row: tile.row,
                col: tile.col,
                title: tile.title.trim(),
                description: tile.description ?? null,
                points: tile.points ?? null,
                conditionKind: tile.condition.kind,
                condition: tile.condition,
                createdAt: now,
                updatedAt: now,
              });
            }
          }

          yield* transaction
            .update(bingoBoardTable)
            .set({ updatedAt: now })
            .where(eq(bingoBoardTable.id, boardId));
        }),
      ),
    );

    yield* publisher.publishRealtimeUpdate({
      guildId,
      boardId,
      reason: "tiles_updated",
    });

    return yield* getBingoBoardDetail(database, guildId, boardId, viewer);
  });

  const updateTileProgress = Effect.fn("bingo.updateTileProgress")(function* (
    guildId: string,
    boardId: string,
    tileId: string,
    viewer: BingoViewer,
    input: UpdateBingoTileProgressRequest,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const outcome = yield* query(
      "bingo.updateTileProgress.tx",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const { board, tiles } = yield* lockGuildBoard(
            transaction,
            guildId,
            boardId,
          );

          const tile = tiles.find((candidate) => candidate.id === tileId);

          if (!tile) {
            return yield* new ResourceNotFoundError("Bingo tile not found");
          }

          const [member] = yield* transaction
            .select({ id: memberTable.id, name: memberTable.name })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.guildId, guildId),
                eq(memberTable.id, input.memberId),
              ),
            )
            .limit(1);

          if (!member) {
            return yield* new ResourceNotFoundError("Guild member not found");
          }

          const nextCount =
            input.currentCount ??
            (input.completed === false ? 0 : tile.condition.targetCount);

          return yield* applyBingoTileProgress(transaction, {
            board,
            boardTiles: tiles,
            tile,
            memberId: member.id,
            memberName: member.name,
            sourceKind: BingoTileConditionKind.MANUAL,
            dedupKey: `manual:${Bun.randomUUIDv7()}`,
            mode: {
              kind: "absolute",
              nextCount,
              forceCompleted: input.completed,
              manualOverride: true,
            },
            summary:
              input.note?.trim() ||
              (input.completed === false
                ? "Cofnięto zaliczenie pola przez administrację"
                : "Ręczna aktualizacja postępu przez administrację"),
            occurredAt: now,
          });
        }),
      ),
    );

    if (outcome.realtimeUpdate) {
      yield* publisher.publishRealtimeUpdate(outcome.realtimeUpdate);
    }

    if (outcome.milestoneQueued) {
      yield* publisher.signalMilestones;
    }

    return yield* getBingoBoardDetail(database, guildId, boardId, viewer);
  });

  return {
    listBoards: (guildId: string, viewer: BingoViewer) =>
      listBingoBoards(database, guildId, viewer),
    getBoard: (guildId: string, boardId: string, viewer: BingoViewer) =>
      getBingoBoardDetail(database, guildId, boardId, viewer),
    createBoard,
    updateBoard,
    deleteBoard,
    replaceTiles,
    updateTileProgress,
  };
};

export type BingoService = ReturnType<typeof makeBingoService>;
