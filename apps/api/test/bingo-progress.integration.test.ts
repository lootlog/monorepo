import { afterAll, beforeAll, expect, it } from "bun:test";
import {
  type BingoTileCondition,
  BingoTileConditionKind,
} from "@lootlog/schema/bingo";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { bingoGridCoords } from "@lootlog/domain/bingo";
import { eq } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import {
  makeBingoEvaluator,
  type BingoKillSignal,
} from "#src/bingo/bingo-evaluator";
import {
  bingoBoardTable,
  bingoMilestoneOutboxTable,
  bingoTileProgressTable,
  bingoTileTable,
} from "#src/database/drizzle/bingo.schema";
import {
  ApiDatabase,
  ApiDatabaseLive,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";

requireIsolatedTestDatabase();

const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

let database: ApiDatabaseValue;

beforeAll(async () => {
  database = await databaseRuntime.runPromise(ApiDatabase);
});

afterAll(async () => {
  await databaseRuntime.dispose();
});

const EPOCH = Date.UTC(2026, 10, 27, 12);

const evaluator = () =>
  makeBingoEvaluator(database, {
    publishRealtimeUpdate: () => Effect.void,
    signalMilestones: Effect.void,
  });

const createKillBoard = (options: {
  readonly mode: "RACE" | "LOCKOUT";
  readonly targetCount: number;
  readonly size?: number;
  readonly filled?: boolean;
}) =>
  Effect.gen(function* () {
    const size = options.size ?? 5;
    const now = new Date(EPOCH);
    const guildId = `bingo-${Bun.randomUUIDv7()}`;
    const boardId = Bun.randomUUIDv7();
    const tileId = Bun.randomUUIDv7();

    yield* database.insert(guildTable).values({
      id: guildId,
      name: "Bingo organization",
      ownerId: "owner",
      updatedAt: now,
    });

    const members = yield* database
      .insert(memberTable)
      .values(
        ["first", "second"].map((name) => ({
          userId: `${guildId}-${name}`,
          guildId,
          name,
          lastDiscordSyncAt: now,
          updatedAt: now,
        })),
      )
      .returning({ id: memberTable.id });

    yield* database.insert(bingoBoardTable).values({
      id: boardId,
      guildId,
      name: "Kill board",
      mode: options.mode,
      size,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    const condition: BingoTileCondition = {
      kind: BingoTileConditionKind.KILL,
      targetCount: options.targetCount,
      npcTypes: [],
    };

    const coords = options.filled
      ? bingoGridCoords(size)
      : [{ row: 0, col: 0 }];

    yield* database.insert(bingoTileTable).values(
      coords.map((coord, index) => ({
        id: index === 0 ? tileId : Bun.randomUUIDv7(),
        boardId,
        ...coord,
        title: "Kill",
        conditionKind: condition.kind,
        condition,
        createdAt: now,
        updatedAt: now,
      })),
    );

    const [first, second] = members;

    if (!first || !second) throw new Error("Bingo members were not created");

    return { guildId, tileId, first: first.id, second: second.id };
  });

const kill = (
  guildId: string,
  memberId: number,
  killedAt: Date,
): BingoKillSignal => ({
  guildId,
  memberId,
  world: "test",
  npcId: 1,
  npcName: "Goblin",
  npcType: NpcTypeEnum.ELITE,
  npcLvl: 40,
  killedAt,
});

const readTileState = (guildId: string, tileId: string) =>
  Effect.gen(function* () {
    const progress = yield* database
      .select()
      .from(bingoTileProgressTable)
      .where(eq(bingoTileProgressTable.tileId, tileId));

    const [tile] = yield* database
      .select()
      .from(bingoTileTable)
      .where(eq(bingoTileTable.id, tileId));

    const milestones = yield* database
      .select()
      .from(bingoMilestoneOutboxTable)
      .where(eq(bingoMilestoneOutboxTable.guildId, guildId));

    return { progress, lockedBy: tile?.lockedByMemberId, milestones };
  });

it("counts concurrent kills of one member and queues a single completion milestone", async () => {
  const state = await databaseRuntime.runPromise(
    Effect.gen(function* () {
      const board = yield* createKillBoard({ mode: "LOCKOUT", targetCount: 3 });
      const killedAt = EPOCH + 60_000;

      yield* Effect.forEach(
        [0, 1, 2, 3],
        (offset) =>
          evaluator().evaluateKill(
            kill(board.guildId, board.first, new Date(killedAt + offset)),
          ),
        { concurrency: "unbounded", discard: true },
      );

      return yield* readTileState(board.guildId, board.tileId);
    }),
  );

  expect(state.progress.map(({ currentCount }) => currentCount)).toEqual([3]);
  expect(state.milestones).toHaveLength(1);
});

it("ignores a redelivered kill without locking the tile", async () => {
  const state = await databaseRuntime.runPromise(
    Effect.gen(function* () {
      const board = yield* createKillBoard({ mode: "LOCKOUT", targetCount: 2 });
      const signal = kill(board.guildId, board.first, new Date(EPOCH + 60_000));

      yield* evaluator().evaluateKill(signal);
      yield* evaluator().evaluateKill(signal);

      return yield* readTileState(board.guildId, board.tileId);
    }),
  );

  expect(state.progress.map(({ currentCount }) => currentCount)).toEqual([1]);
  expect(state.lockedBy).toBeNull();
  expect(state.milestones).toHaveLength(0);
});

it("locks a lockout tile to the first completer and stops other members' progress", async () => {
  const state = await databaseRuntime.runPromise(
    Effect.gen(function* () {
      const board = yield* createKillBoard({ mode: "LOCKOUT", targetCount: 1 });
      const killedAt = EPOCH + 60_000;

      yield* Effect.forEach(
        [board.first, board.second],
        (memberId, index) =>
          evaluator().evaluateKill(
            kill(board.guildId, memberId, new Date(killedAt + index)),
          ),
        { concurrency: "unbounded", discard: true },
      );

      return yield* readTileState(board.guildId, board.tileId);
    }),
  );

  const completed = state.progress.filter(({ completedAt }) => completedAt);

  expect(completed).toHaveLength(1);
  expect(state.lockedBy).toBe(completed[0]?.memberId);
  expect(state.milestones).toHaveLength(1);
});

it("announces a blackout once every tile of a smaller board is completed", async () => {
  const state = await databaseRuntime.runPromise(
    Effect.gen(function* () {
      const board = yield* createKillBoard({
        mode: "RACE",
        targetCount: 1,
        size: 3,
        filled: true,
      });

      yield* evaluator().evaluateKill(
        kill(board.guildId, board.first, new Date(EPOCH + 60_000)),
      );

      return yield* readTileState(board.guildId, board.tileId);
    }),
  );

  expect(state.milestones).toHaveLength(9);
  expect(
    state.milestones.filter(({ event }) => event.milestoneKind === "BLACKOUT"),
  ).toEqual([
    expect.objectContaining({
      event: expect.objectContaining({ totalTileCount: 9 }),
    }),
  ]);
});
