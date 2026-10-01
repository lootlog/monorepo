import {
  createItemSnapshotHash,
  createItemStatsHash,
  createNpcSnapshotHash,
} from "@lootlog/database/snapshot-hash";
import { splitItemStat } from "@lootlog/database/item-stat";
import {
  gameVersionOfWorld,
  type GameVersion,
} from "@lootlog/schema/game-version";
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNull,
  max,
  min,
  sql,
} from "drizzle-orm";
import { groupBy, maxBy, minBy, sortBy, sumBy, uniq } from "es-toolkit";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { lootGameVersionSql } from "#src/database/drizzle/game-version";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
  timerHistoryEntryTable,
} from "#src/database/drizzle/schema";
import {
  LEGACY_REPAIR_MANIFEST_VERSION,
  rowIdsChecksum,
  type LegacyRepairItemRevision,
  type LegacyRepairNpcRevision,
  type LegacyRepairSnapshotBefore,
} from "./legacy-repair-manifest.js";

/**
 * Read-only dry run of the LOO-250 repair. Every NPC and item revision moves
 * to one per game edition, the edition of each loot being its declared game
 * version or its world's edition:
 *
 * - A revision written before editions, or per world, is promoted in place to
 *   the edition most of its loots belong to (for items, the edition whose
 *   client first wrote its name), so its links do not move.
 * - Links from the other edition move to a revision of their own edition.
 *   An item takes the name and icon of that edition's revision of the same
 *   item; without one, the links stay and are recorded as unresolved.
 * - Legacy NPC links whose level timer observations of the same NPC and
 *   edition contradict (LOO-38) move to a revision with the observed level.
 *
 * The plan lists every decision and the links each one moves; `apply`
 * verifies it again before changing anything.
 */

type NpcRow = typeof npcSnapshotTable.$inferSelect;

type ItemRow = typeof itemSnapshotTable.$inferSelect;

/** Timer observations within this distance of a loot evidence its level. */
const LEVEL_EVIDENCE_WINDOW_MILLIS = 7 * 24 * 60 * 60 * 1000;

export interface LegacyRepairPlanLine {
  readonly manifestVersion: number;
  readonly runId: string;
  readonly entryId: string;
  readonly domain: "loot" | "npc" | "item";
  readonly action:
    | "backfillGameVersion"
    | "promoteRevision"
    | "relinkRevision"
    | "markUnresolved"
    | "noop";
  readonly classification: "confirmed" | "unrecoverable";
  readonly unresolvedReason: string | null;
  readonly source: LegacyRepairPlanSource;
  readonly target?: LegacyRepairPlanTarget;
  readonly accessEffect?: {
    readonly direction: "none" | "restrict" | "expand";
    readonly fromLvl: number | null;
    readonly toLvl: number | null;
  };
}

export interface LegacyRepairPlanSource {
  readonly snapshotId?: number;
  readonly itemId?: number;
  readonly lvl?: number | null;
  readonly before?: LegacyRepairSnapshotBefore;
  /** Links a promotion keeps, for review. */
  readonly links?: number;
  readonly dropsInstanceStats?: boolean;
  readonly lootsWithoutGameVersion?: number;
  readonly rowTable?: "LootNpc" | "LootItem";
  readonly rowCount?: number;
  readonly rowIdsFile?: string;
  readonly rowIdsSha256?: string;
}

export interface LegacyRepairPlanTarget {
  readonly proposedRevision: LegacyRepairNpcRevision | LegacyRepairItemRevision;
  readonly proposedSnapshotHash: string;
  readonly nameIconSourceSnapshotId?: number | null;
  readonly retireSnapshotId?: number | null;
}

export interface LegacyRepairPlanRows {
  readonly entryId: string;
  readonly table: "LootNpc" | "LootItem";
  readonly ids: readonly number[];
  readonly file: string;
}

export interface LegacyRepairPlan {
  readonly lines: readonly LegacyRepairPlanLine[];
  readonly rows: readonly LegacyRepairPlanRows[];
}

type Transaction = Parameters<
  Parameters<ApiDatabaseValue["transaction"]>[0]
>[0];

const sha256 = (value: string) =>
  new Bun.CryptoHasher("sha256").update(value).digest("hex");

const otherEdition = (gameVersion: GameVersion): GameVersion =>
  gameVersion === "pl" ? "en" : "pl";

const npcRevisionOf = (
  row: NpcRow,
  gameVersion: GameVersion,
  lvl: number | null,
): LegacyRepairNpcRevision => ({
  identityNamespace: row.identityNamespace,
  gameVersion,
  npcId: row.npcId,
  name: row.name,
  type: row.type,
  lvl,
  icon: row.icon,
  prof: row.prof,
  wt: row.wt,
  margonemType: row.margonemType,
});

/** A revision that already has its edition identity needs no repair. */
const isEditionNpc = (row: NpcRow) =>
  row.gameVersion !== null &&
  row.world === null &&
  row.snapshotHash ===
    createNpcSnapshotHash(npcRevisionOf(row, row.gameVersion, row.lvl));

const itemHash = (
  revision: LegacyRepairItemRevision,
  statRaw: string,
): string =>
  createItemSnapshotHash({
    gameVersion: revision.gameVersion,
    itemId: revision.itemId,
    name: revision.name,
    icon: revision.icon,
    itemType: revision.itemType,
    stat: splitItemStat(statRaw).revision,
  });

const isEditionItem = (row: ItemRow) =>
  row.gameVersion !== null &&
  row.statRaw === splitItemStat(row.statRaw).revision &&
  row.snapshotHash ===
    itemHash(
      {
        gameVersion: row.gameVersion,
        itemId: row.itemId,
        name: row.name,
        icon: row.icon,
        itemType: row.itemType,
        statsHash: row.statsHash,
      },
      row.statRaw,
    );

interface LinkGroup {
  readonly snapshotId: number;
  readonly gameVersion: GameVersion;
  readonly links: number;
  readonly firstLinkId: number;
  readonly lastLinkId: number;
}

export const planLegacyRepair = (database: ApiDatabaseValue, runId: string) =>
  database.transaction((transaction) =>
    Effect.gen(function* () {
      // One consistent, read-only view of every table the plan reads.
      yield* transaction.execute(
        sql`set transaction isolation level repeatable read, read only`,
      );

      const lines: LegacyRepairPlanLine[] = [];
      const rows: LegacyRepairPlanRows[] = [];

      const line = (
        value: Omit<LegacyRepairPlanLine, "manifestVersion" | "runId">,
        linkRows?: Omit<LegacyRepairPlanRows, "entryId">,
      ) => {
        let { source } = value;

        if (linkRows) {
          const ids = [...linkRows.ids].sort((left, right) => left - right);

          rows.push({ ...linkRows, ids, entryId: value.entryId });
          source = {
            ...source,
            rowTable: linkRows.table,
            rowCount: ids.length,
            rowIdsFile: `rows/${linkRows.file}.jsonl`,
            rowIdsSha256: rowIdsChecksum(ids),
          };
        }

        lines.push({
          manifestVersion: LEGACY_REPAIR_MANIFEST_VERSION,
          runId,
          ...value,
          source,
        });
      };

      // ------------------------------------------------------------- loots

      const [unversioned] = yield* transaction
        .select({ loots: count() })
        .from(lootTable)
        .where(isNull(lootTable.gameVersion));

      line({
        entryId: "1:loot:backfill",
        domain: "loot",
        action: "backfillGameVersion",
        classification: "confirmed",
        unresolvedReason: null,
        source: { lootsWithoutGameVersion: unversioned?.loots ?? 0 },
      });

      yield* planNpcs(transaction, line);
      yield* planItems(transaction, line);

      return { lines, rows } satisfies LegacyRepairPlan;
    }),
  );

type Line = (
  value: Omit<LegacyRepairPlanLine, "manifestVersion" | "runId">,
  linkRows?: Omit<LegacyRepairPlanRows, "entryId">,
) => void;

const linkGroups = (
  transaction: Transaction,
  table: "LootNpc" | "LootItem",
) => {
  const link =
    table === "LootNpc"
      ? {
          table: lootNpcTable,
          id: lootNpcTable.id,
          lootId: lootNpcTable.lootId,
          snapshotId: lootNpcTable.npcSnapshotId,
        }
      : {
          table: lootItemTable,
          id: lootItemTable.id,
          lootId: lootItemTable.lootId,
          snapshotId: lootItemTable.itemSnapshotId,
        };

  return (
    transaction
      .select({
        snapshotId: link.snapshotId,
        gameVersion: lootGameVersionSql,
        links: count(),
        firstLinkId: min(link.id).mapWith(Number),
        lastLinkId: max(link.id).mapWith(Number),
      })
      .from(link.table)
      .innerJoin(lootTable, eq(lootTable.id, link.lootId))
      .groupBy(link.snapshotId, lootGameVersionSql)
      // Deterministic plans: equal link counts resolve in edition order.
      .orderBy(link.snapshotId, lootGameVersionSql)
      .pipe(
        Effect.map((groups) =>
          groupBy(groups, (group): string => String(group.snapshotId)),
        ),
      )
  );
};

interface EditionLinks {
  readonly snapshotId: number;
  readonly gameVersion: GameVersion;
}

/**
 * Link ids of the given revisions from loots of the given editions, in one
 * pass over the link table: a revision's links from its own edition, the
 * bulk of the history, are never read.
 */
const linkIdsByEdition = (
  transaction: Transaction,
  table: "LootNpc" | "LootItem",
  wanted: readonly EditionLinks[],
) =>
  Effect.gen(function* () {
    const result = new Map<string, number[]>();

    if (wanted.length === 0) return result;

    const link =
      table === "LootNpc"
        ? {
            table: lootNpcTable,
            id: lootNpcTable.id,
            lootId: lootNpcTable.lootId,
            snapshotId: lootNpcTable.npcSnapshotId,
          }
        : {
            table: lootItemTable,
            id: lootItemTable.id,
            lootId: lootItemTable.lootId,
            snapshotId: lootItemTable.itemSnapshotId,
          };

    const pairs = sql.join(
      wanted.map(
        ({ snapshotId, gameVersion }) =>
          sql`(${snapshotId}::integer, ${gameVersion}::"GameVersion")`,
      ),
      sql`, `,
    );

    const links = yield* transaction
      .select({
        id: link.id,
        snapshotId: link.snapshotId,
        gameVersion: lootGameVersionSql,
      })
      .from(link.table)
      .innerJoin(lootTable, eq(lootTable.id, link.lootId))
      .where(
        and(
          inArray(
            link.snapshotId,
            uniq(wanted.map(({ snapshotId }) => snapshotId)),
          ),
          sql`(${link.snapshotId}, ${lootGameVersionSql}) in (values ${pairs})`,
        ),
      );

    for (const { id, snapshotId, gameVersion } of links) {
      const key = `${snapshotId}:${gameVersion}`;

      result.set(key, [...(result.get(key) ?? []), id]);
    }

    return result;
  });

/** Plan lines whose link ids are read together once every line is known. */
const deferredLines = (line: Line, table: "LootNpc" | "LootItem") => {
  const pending: Array<{
    value: Parameters<Line>[0];
    file: string;
    links: EditionLinks;
  }> = [];

  return {
    add: (value: Parameters<Line>[0], file: string, links: EditionLinks) => {
      pending.push({ value, file, links });
    },
    write: (transaction: Transaction) =>
      Effect.gen(function* () {
        const ids = yield* linkIdsByEdition(
          transaction,
          table,
          pending.map(({ links }) => links),
        );

        for (const { value, file, links } of pending) {
          line(value, {
            table,
            file,
            ids: ids.get(`${links.snapshotId}:${links.gameVersion}`) ?? [],
          });
        }
      }),
  };
};

// -------------------------------------------------------------------- NPCs

interface NpcLevelLink {
  readonly id: number;
  readonly gameVersion: GameVersion;
  readonly lvl: number | null;
  // `relink`, `noop:<reason>` or `unresolved:<reason>`
  readonly decision: string;
}

/**
 * LOO-38 level evidence, per loot link of a legacy revision: timer entries
 * created for the same NPC id and name in the loot's edition within seven
 * days of the loot. One observed level other than the stored one moves the
 * link to it; anything less certain keeps the stored level.
 */
const classifyNpcLevels = (transaction: Transaction, legacy: NpcRow[]) =>
  Effect.gen(function* () {
    const timerName = sql<string>`${timerHistoryEntryTable.npc}->>'name'`;
    const timerLvl = sql<number>`(${timerHistoryEntryTable.npc}->>'lvl')::int`;

    const contradicted = yield* transaction
      .selectDistinct({ snapshotId: npcSnapshotTable.id })
      .from(npcSnapshotTable)
      .innerJoin(
        timerHistoryEntryTable,
        and(
          eq(timerHistoryEntryTable.npcId, npcSnapshotTable.npcId),
          eq(timerName, npcSnapshotTable.name),
        ),
      )
      .where(
        and(
          isNull(npcSnapshotTable.snapshotHash),
          eq(timerHistoryEntryTable.action, "CREATE"),
          sql`${timerLvl} is distinct from ${npcSnapshotTable.lvl}`,
        ),
      );

    const ids = new Set(contradicted.map(({ snapshotId }) => snapshotId));
    const candidates = legacy.filter(({ id }) => ids.has(id));
    const result = new Map<number, NpcLevelLink[]>();

    if (candidates.length === 0) return result;

    const observations = yield* transaction
      .select({
        npcId: timerHistoryEntryTable.npcId,
        name: timerName,
        world: timerHistoryEntryTable.world,
        lvl: timerLvl,
        createdAt: timerHistoryEntryTable.createdAt,
      })
      .from(timerHistoryEntryTable)
      .where(
        and(
          eq(timerHistoryEntryTable.action, "CREATE"),
          inArray(
            timerHistoryEntryTable.npcId,
            uniq(candidates.map(({ npcId }) => npcId)),
          ),
        ),
      );

    const byNpc = groupBy(
      observations.map((observation) => ({
        ...observation,
        gameVersion: gameVersionOfWorld(observation.world),
        at: observation.createdAt.getTime(),
      })),
      ({ npcId, name, gameVersion }) => `${npcId}:${name}:${gameVersion}`,
    );

    const links = yield* transaction
      .select({
        id: lootNpcTable.id,
        snapshotId: lootNpcTable.npcSnapshotId,
        gameVersion: lootGameVersionSql,
        createdAt: lootTable.createdAt,
      })
      .from(lootNpcTable)
      .innerJoin(lootTable, eq(lootTable.id, lootNpcTable.lootId))
      .where(
        inArray(
          lootNpcTable.npcSnapshotId,
          candidates.map(({ id }) => id),
        ),
      )
      .orderBy(asc(lootNpcTable.id));

    const byId = new Map(candidates.map((row) => [row.id, row]));

    for (const link of links) {
      const snapshot = byId.get(link.snapshotId);

      if (!snapshot) continue;

      const at = link.createdAt.getTime();

      const levels = (gameVersion: GameVersion) =>
        new Set(
          (byNpc[`${snapshot.npcId}:${snapshot.name}:${gameVersion}`] ?? [])
            .filter(
              (observation) =>
                Math.abs(observation.at - at) <= LEVEL_EVIDENCE_WINDOW_MILLIS,
            )
            .map(({ lvl }) => lvl),
        );

      const observed = levels(link.gameVersion);
      let lvl = snapshot.lvl;
      let decision: string;

      if (observed.size === 0) {
        decision =
          levels(otherEdition(link.gameVersion)).size > 0
            ? "unresolved:onlyOtherEditionEvidence"
            : "unresolved:noDatedEvidence";
      } else if (snapshot.lvl !== null && observed.has(snapshot.lvl)) {
        decision =
          observed.size === 1
            ? "noop:timerConsistent"
            : "unresolved:bothLevelsObserved";
      } else if (observed.size === 1) {
        [lvl = snapshot.lvl] = observed;
        decision = "relink";
      } else {
        decision = "unresolved:severalOtherLevelsObserved";
      }

      const list = result.get(snapshot.id) ?? [];

      list.push({ id: link.id, gameVersion: link.gameVersion, lvl, decision });
      result.set(snapshot.id, list);
    }

    return result;
  });

/** Links of one NPC revision from one edition at one level. */
interface NpcCell {
  readonly gameVersion: GameVersion;
  readonly lvl: number | null;
  readonly links: number;
  /** Known for classified links; read later for the others. */
  readonly ids: readonly number[] | null;
}

const accessDirection = (from: number | null, to: number | null) => {
  if (from === to) return "none";

  return (to ?? 0) > (from ?? 0) ? "restrict" : "expand";
};

// Links per edition and level; without level evidence every link keeps the
// stored level.
const npcCells = (
  row: NpcRow,
  linked: readonly LinkGroup[],
  classified: readonly NpcLevelLink[] | undefined,
): NpcCell[] =>
  classified
    ? Object.values(
        groupBy(classified, ({ gameVersion, lvl }) => `${gameVersion}:${lvl}`),
      ).flatMap((links) => {
        const [first] = links;

        return first
          ? [
              {
                gameVersion: first.gameVersion,
                lvl: first.lvl,
                links: links.length,
                ids: links.map(({ id }) => id),
              },
            ]
          : [];
      })
    : linked.map((group) => ({
        gameVersion: group.gameVersion,
        lvl: row.lvl,
        links: group.links,
        ids: null,
      }));

// Level evidence that keeps the stored level is recorded, not applied.
const recordNpcLevels = (
  line: Line,
  row: NpcRow,
  classified: readonly NpcLevelLink[],
) => {
  const kept = groupBy(
    classified.filter(({ decision }) => decision !== "relink"),
    ({ decision }) => decision,
  );

  for (const [decision, links] of Object.entries(kept)) {
    const [kind, reason = null] = decision.split(":");
    const noop = kind === "noop";

    line(
      {
        entryId: `4:npc:${decision}:${row.id}`,
        domain: "npc",
        action: noop ? "noop" : "markUnresolved",
        classification: noop ? "confirmed" : "unrecoverable",
        unresolvedReason: noop ? null : reason,
        source: { snapshotId: row.id, lvl: row.lvl },
      },
      {
        table: "LootNpc",
        ids: links.map(({ id }) => id),
        file: noop ? "npc-noop" : "npc-markUnresolved",
      },
    );
  }
};

interface NpcPlanContext {
  readonly line: Line;
  readonly deferred: ReturnType<typeof deferredLines>;
  readonly holders: ReadonlyMap<string, number>;
}

const planNpcRevision = (
  { line, deferred, holders }: NpcPlanContext,
  row: NpcRow,
  linked: readonly LinkGroup[],
  classified: readonly NpcLevelLink[] | undefined,
) => {
  const cells = npcCells(row, linked, classified);

  // Only a revision written before editions is promoted: its links are the
  // bulk of the history. A per-world revision holds recent links only and is
  // merged into its edition revision.
  const home =
    row.snapshotHash === null
      ? maxBy(
          cells.filter(({ lvl }) => lvl === row.lvl),
          ({ links }) => links,
        )
      : undefined;

  if (home) {
    const revision = npcRevisionOf(row, home.gameVersion, row.lvl);
    const snapshotHash = createNpcSnapshotHash(revision);

    line({
      entryId: `2:npc:promote:${row.id}`,
      domain: "npc",
      action: "promoteRevision",
      classification: "confirmed",
      unresolvedReason: null,
      source: {
        snapshotId: row.id,
        before: {
          snapshotHash: row.snapshotHash,
          gameVersion: row.gameVersion,
          world: row.world,
        },
        links: home.links,
      },
      target: {
        proposedRevision: revision,
        proposedSnapshotHash: snapshotHash,
        retireSnapshotId: holders.get(`${row.npcId}:${snapshotHash}`) ?? null,
      },
    });
  }

  for (const cell of cells) {
    if (cell === home) continue;

    const revision = npcRevisionOf(row, cell.gameVersion, cell.lvl);

    const value: Parameters<Line>[0] = {
      entryId: `3:npc:relink:${row.id}:${cell.gameVersion}:${cell.lvl}`,
      domain: "npc",
      action: "relinkRevision",
      classification: "confirmed",
      unresolvedReason: null,
      source: { snapshotId: row.id, lvl: row.lvl },
      target: {
        proposedRevision: revision,
        proposedSnapshotHash: createNpcSnapshotHash(revision),
      },
      accessEffect: {
        direction: accessDirection(row.lvl, cell.lvl),
        fromLvl: row.lvl,
        toLvl: cell.lvl,
      },
    };

    if (cell.ids) {
      line(value, {
        table: "LootNpc",
        ids: cell.ids,
        file: "npc-relinkRevision",
      });
    } else {
      deferred.add(value, "npc-relinkRevision", {
        snapshotId: row.id,
        gameVersion: cell.gameVersion,
      });
    }
  }

  if (classified) recordNpcLevels(line, row, classified);
};

const planNpcs = (transaction: Transaction, line: Line) =>
  Effect.gen(function* () {
    const snapshots = yield* transaction.select().from(npcSnapshotTable);
    const groups = yield* linkGroups(transaction, "LootNpc");

    const holders = new Map(
      snapshots.flatMap((row) =>
        row.snapshotHash === null
          ? []
          : [[`${row.npcId}:${row.snapshotHash}`, row.id] as const],
      ),
    );

    const levels = yield* classifyNpcLevels(
      transaction,
      snapshots.filter(({ snapshotHash }) => snapshotHash === null),
    );

    const deferred = deferredLines(line, "LootNpc");

    for (const row of sortBy(snapshots, [({ id }) => id])) {
      const linked = groups[String(row.id)] ?? [];

      if (linked.length === 0 || isEditionNpc(row)) continue;

      planNpcRevision(
        { line, deferred, holders },
        row,
        linked,
        levels.get(row.id),
      );
    }

    yield* deferred.write(transaction);
  });

// ------------------------------------------------------------------- items

const planItems = (transaction: Transaction, line: Line) =>
  Effect.gen(function* () {
    const snapshots = yield* transaction.select().from(itemSnapshotTable);
    const groups = yield* linkGroups(transaction, "LootItem");

    const holders = new Map(
      snapshots.flatMap((row) =>
        row.snapshotHash === null
          ? []
          : [[`${row.itemId}:${row.snapshotHash}`, row.id] as const],
      ),
    );

    // The edition of a revision's name: its own, or, for a revision written
    // before editions, the edition of the loot whose client first wrote it.
    const nameEdition = new Map(
      snapshots.flatMap((row) => {
        const first = minBy(
          groups[String(row.id)] ?? [],
          ({ firstLinkId }) => firstLinkId,
        );

        const gameVersion = row.gameVersion ?? first?.gameVersion;

        return gameVersion ? [[row.id, gameVersion] as const] : [];
      }),
    );

    const lastLink = (row: ItemRow) =>
      Math.max(0, ...(groups[String(row.id)] ?? []).map((g) => g.lastLinkId));

    const byItem = groupBy(snapshots, ({ itemId }) => String(itemId));
    const deferred = deferredLines(line, "LootItem");

    // The name and icon one edition shows for an item id and type, from its
    // most recently looted revision; none when the edition has several names.
    const sameEditionPresentation = (
      row: ItemRow,
      gameVersion: GameVersion,
    ) => {
      const candidates = (byItem[String(row.itemId)] ?? []).filter(
        (other) =>
          other.id !== row.id &&
          (other.itemType ?? null) === (row.itemType ?? null) &&
          nameEdition.get(other.id) === gameVersion,
      );

      const names = uniq(candidates.map(({ name }) => name));

      if (names.length !== 1) {
        return {
          presentation: null,
          reason:
            names.length === 0
              ? "noSameEditionName"
              : "severalSameEditionNames",
        };
      }

      return {
        presentation: maxBy(candidates, lastLink) ?? null,
        reason: null,
      };
    };

    for (const row of sortBy(snapshots, [({ id }) => id])) {
      const linked = groups[String(row.id)] ?? [];

      if (linked.length === 0 || isEditionItem(row)) continue;

      const revisionOf = (
        gameVersion: GameVersion,
        presentation: ItemRow,
      ): LegacyRepairItemRevision => ({
        gameVersion,
        itemId: row.itemId,
        name: presentation.name,
        icon: presentation.icon,
        itemType: row.itemType,
        statsHash: row.statsHash,
      });

      // A revision whose stats no longer hash to its stats hash cannot be
      // matched safely; its links stay.
      if (createItemStatsHash(row.statRaw) !== row.statsHash) {
        for (const group of linked) {
          deferred.add(
            {
              entryId: `4:item:unresolved:${row.id}:${group.gameVersion}`,
              domain: "item",
              action: "markUnresolved",
              classification: "unrecoverable",
              unresolvedReason: "statsHashMismatch",
              source: { snapshotId: row.id, itemId: row.itemId },
            },
            "item-markUnresolved",
            { snapshotId: row.id, gameVersion: group.gameVersion },
          );
        }

        continue;
      }

      const home =
        row.snapshotHash === null ? nameEdition.get(row.id) : undefined;

      if (home) {
        const revision = revisionOf(home, row);
        const snapshotHash = itemHash(revision, row.statRaw);
        const holder = holders.get(`${row.itemId}:${snapshotHash}`);

        line({
          entryId: `2:item:promote:${row.id}`,
          domain: "item",
          action: "promoteRevision",
          classification: "confirmed",
          unresolvedReason: null,
          source: {
            snapshotId: row.id,
            before: {
              snapshotHash: row.snapshotHash,
              gameVersion: row.gameVersion,
              statRawSha256: sha256(row.statRaw),
            },
            links: sumBy(
              linked.filter(({ gameVersion }) => gameVersion === home),
              ({ links }) => links,
            ),
            dropsInstanceStats: splitItemStat(row.statRaw).instance !== null,
          },
          target: {
            proposedRevision: revision,
            proposedSnapshotHash: snapshotHash,
            retireSnapshotId: holder ?? null,
          },
        });
      }

      for (const group of linked) {
        if (group.gameVersion === home) continue;

        // A revision written with an edition, or by a client without one,
        // carries the name that client saw in the loot's edition.
        const ownName =
          row.snapshotHash !== null &&
          (row.gameVersion === null || row.gameVersion === group.gameVersion);

        const { presentation, reason } = ownName
          ? { presentation: row, reason: null }
          : sameEditionPresentation(row, group.gameVersion);

        const links = { snapshotId: row.id, gameVersion: group.gameVersion };

        if (!presentation) {
          deferred.add(
            {
              entryId: `4:item:unresolved:${row.id}:${group.gameVersion}`,
              domain: "item",
              action: "markUnresolved",
              classification: "unrecoverable",
              unresolvedReason: reason,
              source: { snapshotId: row.id, itemId: row.itemId },
            },
            "item-markUnresolved",
            links,
          );

          continue;
        }

        const revision = revisionOf(group.gameVersion, presentation);

        deferred.add(
          {
            entryId: `3:item:relink:${row.id}:${group.gameVersion}`,
            domain: "item",
            action: "relinkRevision",
            classification: "confirmed",
            unresolvedReason: null,
            source: { snapshotId: row.id, itemId: row.itemId },
            target: {
              proposedRevision: revision,
              proposedSnapshotHash: itemHash(revision, row.statRaw),
              nameIconSourceSnapshotId:
                presentation.id === row.id ? null : presentation.id,
            },
          },
          "item-relinkRevision",
          links,
        );
      }
    }

    yield* deferred.write(transaction);
  });
