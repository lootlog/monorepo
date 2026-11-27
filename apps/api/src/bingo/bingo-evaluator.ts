import {
  evaluateBattleCondition,
  findMatchingLootItems,
  matchesHeroSightingCondition,
  matchesKillCondition,
} from "@lootlog/domain/bingo";
import {
  BingoBoardStatus,
  BingoTileConditionKind,
  type BattleRecordedV1,
  type BingoMilestoneNotificationEvent,
  type BingoRealtimeUpdate,
} from "@lootlog/schema/bingo";
import type { NpcTypeEnum } from "@lootlog/schema/npc-type";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  bingoBoardTable,
  bingoTileProgressTable,
  bingoTileTable,
} from "#src/database/drizzle/bingo.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { userMargonemAccountTable } from "#src/database/drizzle/user.schema";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { groupBy } from "es-toolkit";
import {
  applyBingoTileProgress,
  type BingoBoardRow,
} from "./bingo-progress-writer.js";
import type { BingoPublisher } from "./bingo-publisher.js";

const isBoardActiveAt = (board: BingoBoardRow, at: Date): boolean => {
  if (board.status !== BingoBoardStatus.ACTIVE) return false;

  if (board.startsAt !== null && at < board.startsAt) return false;

  if (board.endsAt !== null && at > board.endsAt) return false;

  return true;
};

const emitOutcomes = (
  publisher: BingoPublisher,
  realtimeUpdates: ReadonlyArray<BingoRealtimeUpdate>,
  milestones: ReadonlyArray<BingoMilestoneNotificationEvent>,
) =>
  Effect.all(
    [
      Effect.forEach(realtimeUpdates, publisher.publishRealtimeUpdate, {
        concurrency: 4,
        discard: true,
      }),
      Effect.forEach(milestones, publisher.publishMilestoneNotification, {
        concurrency: 4,
        discard: true,
      }),
    ],
    { concurrency: 2, discard: true },
  );

export type BingoKillSignal = {
  readonly guildId: string;
  readonly memberId: number;
  readonly world: string;
  readonly npcId: number;
  readonly npcName: string;
  readonly npcType: NpcTypeEnum;
  readonly npcLvl: number;
  readonly killedAt: Date;
};

export type BingoHeroSightingSignal = {
  readonly guildId: string;
  readonly sightingId: number;
  readonly world: string;
  readonly heroName: string;
  readonly heroLvl: number;
  readonly manual: boolean;
  readonly detectedById: number;
  readonly occurredAt: Date;
};

export type BingoLootSignal = {
  readonly lootId: number;
  readonly world: string;
  readonly guildIds: ReadonlyArray<string>;
};

export const makeBingoEvaluator = (
  database: typeof ApiDatabase.Service,
  publisher: BingoPublisher,
) => {
  const loadActiveBoardsWithTiles = Effect.fn(
    "bingo.evaluator.loadActiveBoards",
  )(function* (guildIds: ReadonlyArray<string>, world: string, at: Date) {
    if (guildIds.length === 0) return [];

    const boards = yield* database
      .select()
      .from(bingoBoardTable)
      .where(
        and(
          inArray(bingoBoardTable.guildId, [...guildIds]),
          eq(bingoBoardTable.status, BingoBoardStatus.ACTIVE),
          or(isNull(bingoBoardTable.world), eq(bingoBoardTable.world, world)),
        ),
      );

    const activeBoards = boards.filter((board) => isBoardActiveAt(board, at));

    if (activeBoards.length === 0) return [];

    const tiles = yield* database
      .select()
      .from(bingoTileTable)
      .where(
        inArray(
          bingoTileTable.boardId,
          activeBoards.map((board) => board.id),
        ),
      );

    const tilesByBoard = groupBy(tiles, (tile) => tile.boardId);

    return activeBoards.map((board) => ({
      board,
      tiles: tilesByBoard[board.id] ?? [],
    }));
  });

  const evaluateKill = Effect.fn("bingo.evaluator.kill")(function* (
    signal: BingoKillSignal,
  ) {
    const activeBoards = yield* loadActiveBoardsWithTiles(
      [signal.guildId],
      signal.world,
      signal.killedAt,
    );

    if (activeBoards.length === 0) return;

    const memberRows = yield* database
      .select({ id: memberTable.id, name: memberTable.name })
      .from(memberTable)
      .where(eq(memberTable.id, signal.memberId))
      .limit(1);

    const member = memberRows[0];

    if (!member) return;

    const realtimeUpdates: BingoRealtimeUpdate[] = [];
    const milestones: BingoMilestoneNotificationEvent[] = [];

    for (const { board, tiles } of activeBoards) {
      const matchingTiles = tiles.filter(
        (tile) =>
          tile.condition.kind === BingoTileConditionKind.KILL &&
          matchesKillCondition(tile.condition, {
            npcName: signal.npcName,
            npcType: signal.npcType,
            npcLvl: signal.npcLvl,
          }),
      );

      if (matchingTiles.length === 0) continue;

      const dedupKey = `kill:${signal.world}:${signal.npcId}:${signal.killedAt.getTime()}`;

      yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          for (const tile of matchingTiles) {
            const outcome = yield* applyBingoTileProgress(transaction, {
              board,
              boardTiles: tiles,
              tile,
              memberId: member.id,
              memberName: member.name,
              sourceKind: BingoTileConditionKind.KILL,
              dedupKey,
              mode: { kind: "delta", delta: 1 },
              summary: `${signal.npcName} (${signal.npcLvl} lvl)`,
              metadata: {
                npcId: signal.npcId,
                npcName: signal.npcName,
                npcType: signal.npcType,
                npcLvl: signal.npcLvl,
                world: signal.world,
              },
              occurredAt: signal.killedAt,
            });

            if (outcome.realtimeUpdate) {
              realtimeUpdates.push(outcome.realtimeUpdate);
            }

            if (outcome.milestoneNotification) {
              milestones.push(outcome.milestoneNotification);
            }
          }
        }),
      );
    }

    if (realtimeUpdates.length > 0 || milestones.length > 0) {
      yield* emitOutcomes(publisher, realtimeUpdates, milestones);
    }
  });

  const evaluateHeroSighting = Effect.fn("bingo.evaluator.heroSighting")(
    function* (signal: BingoHeroSightingSignal) {
      const activeBoards = yield* loadActiveBoardsWithTiles(
        [signal.guildId],
        signal.world,
        signal.occurredAt,
      );

      if (activeBoards.length === 0) return;

      const memberRows = yield* database
        .select({ id: memberTable.id, name: memberTable.name })
        .from(memberTable)
        .where(eq(memberTable.id, signal.detectedById))
        .limit(1);

      const member = memberRows[0];

      if (!member) return;

      const realtimeUpdates: BingoRealtimeUpdate[] = [];
      const milestones: BingoMilestoneNotificationEvent[] = [];

      for (const { board, tiles } of activeBoards) {
        const matchingTiles = tiles.filter(
          (tile) =>
            tile.condition.kind === BingoTileConditionKind.HERO_SIGHTING &&
            matchesHeroSightingCondition(tile.condition, {
              heroName: signal.heroName,
              heroLvl: signal.heroLvl,
              manual: signal.manual,
            }),
        );

        if (matchingTiles.length === 0) continue;

        const dedupKey = `sighting:${signal.sightingId}`;

        yield* database.transaction((transaction) =>
          Effect.gen(function* () {
            for (const tile of matchingTiles) {
              const outcome = yield* applyBingoTileProgress(transaction, {
                board,
                boardTiles: tiles,
                tile,
                memberId: member.id,
                memberName: member.name,
                sourceKind: BingoTileConditionKind.HERO_SIGHTING,
                dedupKey,
                mode: { kind: "delta", delta: 1 },
                summary: `Wykryto: ${signal.heroName} (${signal.heroLvl} lvl)`,
                metadata: {
                  sightingId: signal.sightingId,
                  heroName: signal.heroName,
                  heroLvl: signal.heroLvl,
                  world: signal.world,
                },
                occurredAt: signal.occurredAt,
              });

              if (outcome.realtimeUpdate) {
                realtimeUpdates.push(outcome.realtimeUpdate);
              }

              if (outcome.milestoneNotification) {
                milestones.push(outcome.milestoneNotification);
              }
            }
          }),
        );
      }

      if (realtimeUpdates.length > 0 || milestones.length > 0) {
        yield* emitOutcomes(publisher, realtimeUpdates, milestones);
      }
    },
  );

  const evaluateLoot = Effect.fn("bingo.evaluator.loot")(function* (
    signal: BingoLootSignal,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const activeBoards = yield* loadActiveBoardsWithTiles(
      signal.guildIds,
      signal.world,
      now,
    );

    if (activeBoards.length === 0) return;

    const boardsWithLootTiles = activeBoards.filter(({ tiles }) =>
      tiles.some((tile) => tile.condition.kind === BingoTileConditionKind.LOOT),
    );

    if (boardsWithLootTiles.length === 0) return;

    const targetGuildIds = [
      ...new Set(boardsWithLootTiles.map(({ board }) => board.guildId)),
    ];

    const [items, npcs, submissions, lootPlayers] = yield* Effect.all(
      [
        database
          .select({
            hid: lootItemTable.hid,
            name: itemSnapshotTable.name,
            rarity: itemSnapshotTable.rarity,
          })
          .from(lootItemTable)
          .innerJoin(
            itemSnapshotTable,
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
          )
          .where(eq(lootItemTable.lootId, signal.lootId)),
        database
          .select({
            name: npcSnapshotTable.name,
            type: npcSnapshotTable.type,
            lvl: npcSnapshotTable.lvl,
          })
          .from(lootNpcTable)
          .innerJoin(
            npcSnapshotTable,
            eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
          )
          .where(eq(lootNpcTable.lootId, signal.lootId)),
        database
          .select({
            guildId: organizationLootRecordTable.guildId,
            memberId: memberTable.id,
            memberName: memberTable.name,
          })
          .from(organizationLootRecordTable)
          .innerJoin(
            lootSubmissionTable,
            eq(
              lootSubmissionTable.organizationLootRecordId,
              organizationLootRecordTable.id,
            ),
          )
          .innerJoin(
            memberTable,
            eq(memberTable.id, lootSubmissionTable.memberId),
          )
          .where(
            and(
              eq(organizationLootRecordTable.lootId, signal.lootId),
              inArray(organizationLootRecordTable.guildId, targetGuildIds),
              isNull(organizationLootRecordTable.archivedAt),
            ),
          ),
        database
          .select({
            accountId: playerSnapshotTable.accountId,
          })
          .from(lootPlayerTable)
          .innerJoin(
            playerSnapshotTable,
            eq(playerSnapshotTable.id, lootPlayerTable.playerSnapshotId),
          )
          .where(eq(lootPlayerTable.lootId, signal.lootId)),
      ],
      { concurrency: 4 },
    );

    const accountIds = [
      ...new Set(lootPlayers.map((player) => String(player.accountId))),
    ];

    const verifiedMembers =
      accountIds.length > 0
        ? yield* database
            .select({
              guildId: memberTable.guildId,
              memberId: memberTable.id,
              memberName: memberTable.name,
            })
            .from(userMargonemAccountTable)
            .innerJoin(
              memberTable,
              and(
                eq(memberTable.globalUserId, userMargonemAccountTable.userId),
                inArray(memberTable.guildId, targetGuildIds),
                eq(memberTable.active, true),
              ),
            )
            .where(inArray(userMargonemAccountTable.accountId, accountIds))
        : [];

    const membersByGuild = new Map<
      string,
      Map<number, { readonly id: number; readonly name: string }>
    >();

    for (const row of [...submissions, ...verifiedMembers]) {
      const guildMap =
        membersByGuild.get(row.guildId) ??
        new Map<number, { readonly id: number; readonly name: string }>();

      guildMap.set(row.memberId, { id: row.memberId, name: row.memberName });
      membersByGuild.set(row.guildId, guildMap);
    }

    const realtimeUpdates: BingoRealtimeUpdate[] = [];
    const milestones: BingoMilestoneNotificationEvent[] = [];

    for (const { board, tiles } of boardsWithLootTiles) {
      const guildMembers = [
        ...(membersByGuild.get(board.guildId)?.values() ?? []),
      ];

      if (guildMembers.length === 0) continue;

      const lootTileMatches = tiles.flatMap((tile) => {
        if (tile.condition.kind !== BingoTileConditionKind.LOOT) return [];

        const matches = findMatchingLootItems(tile.condition, { items, npcs });

        return matches.length > 0 ? [{ tile, matches }] : [];
      });

      if (lootTileMatches.length === 0) continue;

      yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          for (const member of guildMembers) {
            for (const { tile, matches } of lootTileMatches) {
              for (const match of matches) {
                const outcome = yield* applyBingoTileProgress(transaction, {
                  board,
                  boardTiles: tiles,
                  tile,
                  memberId: member.id,
                  memberName: member.name,
                  sourceKind: BingoTileConditionKind.LOOT,
                  dedupKey: `loot:${signal.lootId}:${match.hid}`,
                  mode: { kind: "delta", delta: 1 },
                  summary: match.npcName
                    ? `${match.itemName} (${match.npcName})`
                    : match.itemName,
                  metadata: {
                    lootId: signal.lootId,
                    itemName: match.itemName,
                    rarity: match.rarity,
                    npcName: match.npcName,
                    world: signal.world,
                  },
                  occurredAt: now,
                });

                if (outcome.realtimeUpdate) {
                  realtimeUpdates.push(outcome.realtimeUpdate);
                }

                if (outcome.milestoneNotification) {
                  milestones.push(outcome.milestoneNotification);
                }
              }
            }
          }
        }),
      );
    }

    if (realtimeUpdates.length > 0 || milestones.length > 0) {
      yield* emitOutcomes(publisher, realtimeUpdates, milestones);
    }
  });

  const evaluateBattle = Effect.fn("bingo.evaluator.battle")(function* (
    signal: BattleRecordedV1,
  ) {
    const occurredAt = new Date(signal.occurredAt);

    const memberships = yield* database
      .select({
        guildId: memberTable.guildId,
        memberId: memberTable.id,
        memberName: memberTable.name,
      })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.active, true),
          or(
            eq(memberTable.globalUserId, signal.userId),
            eq(memberTable.userId, signal.userId),
          ),
        ),
      );

    if (memberships.length === 0) return;

    const guildIds = [...new Set(memberships.map((row) => row.guildId))];

    const activeBoards = yield* loadActiveBoardsWithTiles(
      guildIds,
      signal.world,
      occurredAt,
    );

    if (activeBoards.length === 0) return;

    const memberByGuild = new Map(
      memberships.map((membership) => [membership.guildId, membership]),
    );

    const realtimeUpdates: BingoRealtimeUpdate[] = [];
    const milestones: BingoMilestoneNotificationEvent[] = [];

    for (const { board, tiles } of activeBoards) {
      const membership = memberByGuild.get(board.guildId);

      if (!membership) continue;

      const battleTiles = tiles.filter(
        (tile) => tile.condition.kind === BingoTileConditionKind.BATTLE,
      );

      if (battleTiles.length === 0) continue;

      yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          const existingProgress = yield* transaction
            .select()
            .from(bingoTileProgressTable)
            .where(
              and(
                eq(bingoTileProgressTable.boardId, board.id),
                eq(bingoTileProgressTable.memberId, membership.memberId),
              ),
            );

          const progressByTile = new Map(
            existingProgress.map((row) => [row.tileId, row]),
          );

          for (const tile of battleTiles) {
            if (tile.condition.kind !== BingoTileConditionKind.BATTLE) continue;

            const current = progressByTile.get(tile.id);

            const evaluation = evaluateBattleCondition(
              tile.condition,
              {
                battleType: signal.battleType,
                matchmaking: signal.matchmaking,
                won: signal.won,
                unfinished: signal.unfinished,
                hasFlee: signal.hasFlee,
              },
              current?.currentCount ?? 0,
              current?.completedAt !== null && current !== undefined,
            );

            if (!evaluation.matched) continue;

            const summary = evaluation.resetStreak
              ? signal.matchmaking
                ? "Przerwana seria w Otchłani"
                : "Przerwana seria walk PvP"
              : signal.matchmaking
                ? "Wygrana w Otchłani"
                : `Wygrana PvP (${signal.battleType})`;

            const outcome = yield* applyBingoTileProgress(transaction, {
              board,
              boardTiles: tiles,
              tile,
              memberId: membership.memberId,
              memberName: membership.memberName,
              sourceKind: BingoTileConditionKind.BATTLE,
              dedupKey: `battle:${signal.battleId}`,
              mode: {
                kind: "absolute",
                nextCount: evaluation.nextCount,
              },
              summary,
              metadata: {
                battleId: signal.battleId,
                matchmaking: signal.matchmaking,
                battleType: signal.battleType,
                won: signal.won,
                resetStreak: evaluation.resetStreak,
              },
              occurredAt,
            });

            if (outcome.realtimeUpdate) {
              realtimeUpdates.push(outcome.realtimeUpdate);
            }

            if (outcome.milestoneNotification) {
              milestones.push(outcome.milestoneNotification);
            }
          }
        }),
      );
    }

    if (realtimeUpdates.length > 0 || milestones.length > 0) {
      yield* emitOutcomes(publisher, realtimeUpdates, milestones);
    }
  });

  return {
    evaluateKill,
    evaluateHeroSighting,
    evaluateLoot,
    evaluateBattle,
  };
};

export type BingoEvaluatorService = ReturnType<typeof makeBingoEvaluator>;
