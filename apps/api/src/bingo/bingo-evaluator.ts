import {
  evaluateBattleCondition,
  findMatchingLootItems,
  matchesHeroSightingCondition,
  matchesKillCondition,
} from "@lootlog/domain/bingo";
import type { BattleRecordedV1 } from "@lootlog/protocol/rabbit/events";
import {
  BingoBoardStatus,
  BingoTileConditionKind,
} from "@lootlog/schema/bingo";
import {
  NpcTypeEnum,
  type NpcTypeEnum as NpcType,
} from "@lootlog/schema/npc-type";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  bingoBoardTable,
  bingoKillOutboxTable,
  bingoTileProgressTable,
} from "#src/database/drizzle/bingo.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootSubmissionTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { userMargonemAccountTable } from "#src/database/drizzle/user.schema";
import type { KillInput, KillWrite } from "#src/kills/kill-creation.writes";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { Effect } from "effect";
import {
  applyBingoTileProgress,
  lockBingoBoardForProgress,
  type ApplyTileProgressOutcome,
  type BingoBoardRow,
  type BingoTileRow,
  type BingoTransaction,
} from "./bingo-progress-writer.js";
import type { BingoPublisher } from "./bingo-publisher.js";

const isBoardActiveAt = (board: BingoBoardRow, at: Date): boolean => {
  if (board.status !== BingoBoardStatus.ACTIVE) return false;

  if (board.startsAt !== null && at < board.startsAt) return false;

  if (board.endsAt !== null && at > board.endsAt) return false;

  return true;
};

const activeBoardsWhere = (guildIds: ReadonlyArray<string>, world: string) =>
  and(
    inArray(bingoBoardTable.guildId, [...guildIds]),
    eq(bingoBoardTable.status, BingoBoardStatus.ACTIVE),
    or(isNull(bingoBoardTable.world), eq(bingoBoardTable.world, world)),
  );

export type BingoKillSignal = {
  readonly guildId: string;
  readonly memberId: number;
  readonly world: string;
  readonly npcId: number;
  readonly npcName: string;
  readonly npcType: NpcType;
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

type LockedBoard = {
  readonly board: BingoBoardRow;
  readonly tiles: ReadonlyArray<BingoTileRow>;
  readonly transaction: BingoTransaction;
};

export const enqueueBingoKill =
  (
    kill: KillInput & { readonly guildId: string; readonly memberId: number },
  ): KillWrite =>
  (transaction) => [
    Effect.gen(function* () {
      const [board] = yield* transaction
        .select({ id: bingoBoardTable.id })
        .from(bingoBoardTable)
        .where(activeBoardsWhere([kill.guildId], kill.world))
        .limit(1);

      if (!board) return;

      yield* transaction.insert(bingoKillOutboxTable).values({
        guildId: kill.guildId,
        memberId: kill.memberId,
        world: kill.world,
        npcId: kill.npcId,
        npcName: kill.npcName,
        npcType: kill.npcType,
        npcLvl: kill.npcLvl,
        killedAt: kill.lastKilledAt,
      });
    }),
  ];

export const makeBingoEvaluator = (
  database: typeof ApiDatabase.Service,
  publisher: BingoPublisher,
) => {
  const findActiveBoards = Effect.fn("bingo.evaluator.findActiveBoards")(
    function* (guildIds: ReadonlyArray<string>, world: string, at: Date) {
      if (guildIds.length === 0) return [];

      const boards = yield* database
        .select()
        .from(bingoBoardTable)
        .where(activeBoardsWhere(guildIds, world))
        .orderBy(bingoBoardTable.id);

      return boards.filter((board) => isBoardActiveAt(board, at));
    },
  );

  const progressBoards = Effect.fn("bingo.evaluator.progressBoards")(function* <
    E,
  >(
    boards: ReadonlyArray<BingoBoardRow>,
    at: Date,
    apply: (
      locked: LockedBoard,
    ) => Effect.Effect<ReadonlyArray<ApplyTileProgressOutcome>, E>,
  ) {
    const outcomes = yield* Effect.forEach(boards, ({ id: boardId }) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const locked = yield* lockBingoBoardForProgress(transaction, boardId);

          if (!locked || !isBoardActiveAt(locked.board, at)) return [];

          return yield* apply({ ...locked, transaction });
        }),
      ),
    );

    const applied = outcomes.flat();

    yield* Effect.forEach(
      applied.flatMap(({ realtimeUpdate }) =>
        realtimeUpdate ? [realtimeUpdate] : [],
      ),
      publisher.publishRealtimeUpdate,
      { concurrency: 4, discard: true },
    );

    if (applied.some(({ milestoneQueued }) => milestoneQueued)) {
      yield* publisher.signalMilestones;
    }
  });

  const findMember = (guildId: string, memberId: number) =>
    database
      .select({ id: memberTable.id, name: memberTable.name })
      .from(memberTable)
      .where(
        and(eq(memberTable.guildId, guildId), eq(memberTable.id, memberId)),
      )
      .limit(1)
      .pipe(Effect.map((rows) => rows[0] ?? null));

  const evaluateKill = Effect.fn("bingo.evaluator.kill")(function* (
    signal: BingoKillSignal,
  ) {
    const boards = yield* findActiveBoards(
      [signal.guildId],
      signal.world,
      signal.killedAt,
    );

    if (boards.length === 0) return;

    const member = yield* findMember(signal.guildId, signal.memberId);

    if (!member) return;

    yield* progressBoards(
      boards,
      signal.killedAt,
      ({ board, tiles, transaction }) =>
        Effect.forEach(
          tiles.filter(
            (tile) =>
              tile.condition.kind === BingoTileConditionKind.KILL &&
              matchesKillCondition(tile.condition, {
                npcName: signal.npcName,
                npcType: signal.npcType,
                npcLvl: signal.npcLvl,
              }),
          ),
          (tile) =>
            applyBingoTileProgress(transaction, {
              board,
              boardTiles: tiles,
              tile,
              memberId: member.id,
              memberName: member.name,
              sourceKind: BingoTileConditionKind.KILL,
              dedupKey: `kill:${signal.world}:${signal.npcId}:${signal.killedAt.getTime()}`,
              mode: { kind: "delta", delta: 1 },
              summary: `${signal.npcName} (${signal.npcLvl} lvl)`,
              metadata: {
                npcId: signal.npcId,
                npcName: signal.npcName,
                world: signal.world,
                npcs: [{ type: signal.npcType, lvl: signal.npcLvl }],
              },
              occurredAt: signal.killedAt,
            }),
        ),
    );
  });

  const evaluateHeroSighting = Effect.fn("bingo.evaluator.heroSighting")(
    function* (signal: BingoHeroSightingSignal) {
      const boards = yield* findActiveBoards(
        [signal.guildId],
        signal.world,
        signal.occurredAt,
      );

      if (boards.length === 0) return;

      const member = yield* findMember(signal.guildId, signal.detectedById);

      if (!member) return;

      yield* progressBoards(
        boards,
        signal.occurredAt,
        ({ board, tiles, transaction }) =>
          Effect.forEach(
            tiles.filter(
              (tile) =>
                tile.condition.kind === BingoTileConditionKind.HERO_SIGHTING &&
                matchesHeroSightingCondition(tile.condition, {
                  heroName: signal.heroName,
                  heroLvl: signal.heroLvl,
                  manual: signal.manual,
                }),
            ),
            (tile) =>
              applyBingoTileProgress(transaction, {
                board,
                boardTiles: tiles,
                tile,
                memberId: member.id,
                memberName: member.name,
                sourceKind: BingoTileConditionKind.HERO_SIGHTING,
                dedupKey: `sighting:${signal.sightingId}`,
                mode: { kind: "delta", delta: 1 },
                summary: `Wykryto: ${signal.heroName} (${signal.heroLvl} lvl)`,
                metadata: {
                  sightingId: signal.sightingId,
                  heroName: signal.heroName,
                  world: signal.world,
                  npcs: [{ type: NpcTypeEnum.HERO, lvl: signal.heroLvl }],
                },
                occurredAt: signal.occurredAt,
              }),
          ),
      );
    },
  );

  const loadLootParticipants = Effect.fn("bingo.evaluator.lootParticipants")(
    function* (lootId: number, guildIds: ReadonlyArray<string>) {
      const [submissions, lootPlayers] = yield* Effect.all(
        [
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
                eq(organizationLootRecordTable.lootId, lootId),
                inArray(organizationLootRecordTable.guildId, [...guildIds]),
                isNull(organizationLootRecordTable.archivedAt),
              ),
            ),
          database
            .select({ accountId: playerSnapshotTable.accountId })
            .from(lootPlayerTable)
            .innerJoin(
              playerSnapshotTable,
              eq(playerSnapshotTable.id, lootPlayerTable.playerSnapshotId),
            )
            .where(eq(lootPlayerTable.lootId, lootId)),
        ],
        { concurrency: 2 },
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
                  inArray(memberTable.guildId, [...guildIds]),
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
        const guildMembers =
          membersByGuild.get(row.guildId) ??
          new Map<number, { readonly id: number; readonly name: string }>();

        guildMembers.set(row.memberId, {
          id: row.memberId,
          name: row.memberName,
        });
        membersByGuild.set(row.guildId, guildMembers);
      }

      return membersByGuild;
    },
  );

  const evaluateLoot = Effect.fn("bingo.evaluator.loot")(function* (
    signal: BingoLootSignal,
  ) {
    const [loot] = yield* database
      .select({ createdAt: lootTable.createdAt })
      .from(lootTable)
      .where(eq(lootTable.id, signal.lootId))
      .limit(1);

    if (!loot) return;

    const droppedAt = loot.createdAt;

    const boards = yield* findActiveBoards(
      signal.guildIds,
      signal.world,
      droppedAt,
    );

    if (boards.length === 0) return;

    const [items, npcs] = yield* Effect.all(
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
      ],
      { concurrency: 2 },
    );

    const membersByGuild = yield* loadLootParticipants(
      signal.lootId,
      signal.guildIds,
    );

    const participatingBoards = boards.filter((board) =>
      membersByGuild.has(board.guildId),
    );

    yield* progressBoards(
      participatingBoards,
      droppedAt,
      ({ board, tiles, transaction }) => {
        const guildMembers = [
          ...(membersByGuild.get(board.guildId)?.values() ?? []),
        ];

        const lootTileMatches = tiles.flatMap((tile) => {
          if (tile.condition.kind !== BingoTileConditionKind.LOOT) return [];

          const matches = findMatchingLootItems(tile.condition, {
            items,
            npcs,
          });

          return matches.length > 0 ? [{ tile, matches }] : [];
        });

        const progress = guildMembers.flatMap((member) =>
          lootTileMatches.flatMap(({ tile, matches }) =>
            matches.map((match) => ({ member, tile, match })),
          ),
        );

        return Effect.forEach(progress, ({ member, tile, match }) =>
          applyBingoTileProgress(transaction, {
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
              npcs: npcs.map(({ type, lvl }) => ({ type, lvl })),
            },
            occurredAt: droppedAt,
          }),
        );
      },
    );
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

    const memberByGuild = new Map(
      memberships.map((membership) => [membership.guildId, membership]),
    );

    const boards = yield* findActiveBoards(
      [...memberByGuild.keys()],
      signal.world,
      occurredAt,
    );

    if (boards.length === 0) return;

    yield* progressBoards(boards, occurredAt, ({ board, tiles, transaction }) =>
      Effect.gen(function* () {
        const membership = memberByGuild.get(board.guildId);

        if (!membership) return [];

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

        return yield* Effect.forEach(tiles, (tile) => {
          if (tile.condition.kind !== BingoTileConditionKind.BATTLE) {
            return Effect.succeed<ApplyTileProgressOutcome>({
              applied: false,
            });
          }

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
            current !== undefined && current.completedAt !== null,
          );

          if (!evaluation.matched) {
            return Effect.succeed<ApplyTileProgressOutcome>({
              applied: false,
            });
          }

          const summary = evaluation.resetStreak
            ? signal.matchmaking
              ? "Przerwana seria w Otchłani"
              : "Przerwana seria walk PvP"
            : signal.matchmaking
              ? "Wygrana w Otchłani"
              : `Wygrana PvP (${signal.battleType})`;

          return applyBingoTileProgress(transaction, {
            board,
            boardTiles: tiles,
            tile,
            memberId: membership.memberId,
            memberName: membership.memberName,
            sourceKind: BingoTileConditionKind.BATTLE,
            dedupKey: `battle:${signal.battleId}`,
            mode: { kind: "absolute", nextCount: evaluation.nextCount },
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
        });
      }),
    );
  });

  return {
    evaluateKill,
    evaluateHeroSighting,
    evaluateLoot,
    evaluateBattle,
  };
};

export type BingoEvaluatorService = ReturnType<typeof makeBingoEvaluator>;
