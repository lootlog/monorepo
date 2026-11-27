import { adapterOperation } from "@lootlog/instrumentation/operation";
import { buildStarterBingoTiles } from "@lootlog/domain/bingo";
import {
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
  bingoTileProgressTable,
  bingoTileTable,
} from "#src/database/drizzle/bingo.schema";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { and, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import {
  applyBingoTileProgress,
  type BingoTileRow,
} from "./bingo-progress-writer.js";
import type { BingoPublisher } from "./bingo-publisher.js";
import {
  findBingoViewerMember,
  getBingoBoardDetail,
  listBingoBoards,
  requireBingoBoard,
} from "./bingo-read.js";

const parseOptionalDate = (
  value: string | null | undefined,
): Date | null | undefined => {
  if (value === undefined) return undefined;

  if (value === null) return null;

  return new Date(value);
};

const validateTileCoordinates = (tiles: ReadonlyArray<BingoTileInput>) => {
  const seen = new Set<string>();

  for (const tile of tiles) {
    const key = `${tile.row}:${tile.col}`;

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

export const makeBingoService = (
  database: typeof ApiDatabase.Service,
  publisher: BingoPublisher,
) => {
  const query = adapterOperation("bingo.drizzle");

  const createBoard = Effect.fn("bingo.createBoard")(function* (
    guildId: string,
    viewerDiscordId: string,
    input: CreateBingoBoardRequest,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const viewer = yield* findBingoViewerMember(
      database,
      guildId,
      viewerDiscordId,
    );

    const boardId = Bun.randomUUIDv7();

    const initialTiles: ReadonlyArray<BingoTileInput> =
      input.tiles !== undefined
        ? input.tiles
        : input.populateStarterTiles !== false
          ? buildStarterBingoTiles()
          : [];

    yield* validateTileCoordinates(initialTiles);

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
            status: BingoBoardStatus.DRAFT,
            pointsPerTile: input.pointsPerTile ?? 1,
            pointsPerLine: input.pointsPerLine ?? 5,
            firstCompleterBonus: input.firstCompleterBonus ?? 0,
            blackoutBonus: input.blackoutBonus ?? 10,
            startsAt: parseOptionalDate(input.startsAt) ?? null,
            endsAt: parseOptionalDate(input.endsAt) ?? null,
            createdByMemberId: viewer?.id ?? null,
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

    return yield* getBingoBoardDetail(
      database,
      guildId,
      boardId,
      viewerDiscordId,
    );
  });

  const updateBoard = Effect.fn("bingo.updateBoard")(function* (
    guildId: string,
    boardId: string,
    viewerDiscordId: string,
    input: UpdateBingoBoardRequest,
  ) {
    yield* requireBingoBoard(database, guildId, boardId);

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
      database
        .update(bingoBoardTable)
        .set(patch)
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
      reason: "board_updated",
    });

    const detail = yield* getBingoBoardDetail(
      database,
      guildId,
      boardId,
      viewerDiscordId,
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
    viewerDiscordId: string,
    input: ReplaceBingoTilesRequest,
  ) {
    yield* requireBingoBoard(database, guildId, boardId);
    yield* validateTileCoordinates(input.tiles);

    const now = new Date(yield* Clock.currentTimeMillis);

    yield* query(
      "bingo.replaceTiles",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const existingTiles = yield* transaction
            .select()
            .from(bingoTileTable)
            .where(eq(bingoTileTable.boardId, boardId));

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
              yield* transaction
                .update(bingoTileTable)
                .set({
                  title: tile.title.trim(),
                  description: tile.description ?? null,
                  points: tile.points ?? null,
                  conditionKind: tile.condition.kind,
                  condition: tile.condition,
                  updatedAt: now,
                })
                .where(eq(bingoTileTable.id, current.id));

              yield* transaction
                .update(bingoTileProgressTable)
                .set({
                  targetCount: tile.condition.targetCount,
                  updatedAt: now,
                })
                .where(eq(bingoTileProgressTable.tileId, current.id));
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

    return yield* getBingoBoardDetail(
      database,
      guildId,
      boardId,
      viewerDiscordId,
    );
  });

  const updateTileProgress = Effect.fn("bingo.updateTileProgress")(function* (
    guildId: string,
    boardId: string,
    tileId: string,
    viewerDiscordId: string,
    input: UpdateBingoTileProgressRequest,
  ) {
    const board = yield* requireBingoBoard(database, guildId, boardId);
    const now = new Date(yield* Clock.currentTimeMillis);

    const [tiles, memberRows] = yield* Effect.all(
      [
        query(
          "bingo.updateTileProgress.tiles",
          database
            .select()
            .from(bingoTileTable)
            .where(eq(bingoTileTable.boardId, board.id)),
        ),
        query(
          "bingo.updateTileProgress.member",
          database
            .select({
              id: memberTable.id,
              name: memberTable.name,
            })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.guildId, guildId),
                eq(memberTable.id, input.memberId),
              ),
            )
            .limit(1),
        ),
      ],
      { concurrency: 2 },
    );

    const tile = tiles.find((candidate) => candidate.id === tileId);

    if (!tile) {
      return yield* new ResourceNotFoundError("Bingo tile not found");
    }

    const member = memberRows[0];

    if (!member) {
      return yield* new ResourceNotFoundError("Guild member not found");
    }

    const nextCount =
      input.currentCount ??
      (input.completed === true
        ? tile.condition.targetCount
        : input.completed === false
          ? 0
          : tile.condition.targetCount);

    const outcome = yield* query(
      "bingo.updateTileProgress.tx",
      database.transaction((transaction) =>
        applyBingoTileProgress(transaction, {
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
        }),
      ),
    );

    if (outcome.realtimeUpdate) {
      yield* publisher.publishRealtimeUpdate(outcome.realtimeUpdate);
    }

    if (outcome.milestoneNotification) {
      yield* publisher.publishMilestoneNotification(
        outcome.milestoneNotification,
      );
    }

    return yield* getBingoBoardDetail(
      database,
      guildId,
      boardId,
      viewerDiscordId,
    );
  });

  return {
    listBoards: (guildId: string, viewerDiscordId: string) =>
      listBingoBoards(database, guildId, viewerDiscordId),
    getBoard: (guildId: string, boardId: string, viewerDiscordId: string) =>
      getBingoBoardDetail(database, guildId, boardId, viewerDiscordId),
    createBoard,
    updateBoard,
    deleteBoard,
    replaceTiles,
    updateTileProgress,
  };
};

export type BingoService = ReturnType<typeof makeBingoService>;
