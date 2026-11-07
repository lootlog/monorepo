import { MAX_FIXED_LEVELS } from "@lootlog/domain/elastic-level";
import { and, eq, sql } from "drizzle-orm";
import { groupBy, maxBy, minBy, sortBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  lootItemTable,
  lootTable,
} from "#src/database/drizzle/loot.schema";

/**
 * When every revision of an item that has more than one was first and last
 * looted. Revisions are dated by their loots: a revision row's own creation
 * time is when it was stored, and backfills stored most of them at once.
 */
export const buildItemRevisionsQuery = (database: ApiDatabaseValue) => {
  const revised = database.$with("revised_items").as(
    database
      .select({
        gameVersion: itemSnapshotTable.gameVersion,
        itemId: itemSnapshotTable.itemId,
      })
      .from(itemSnapshotTable)
      .groupBy(itemSnapshotTable.gameVersion, itemSnapshotTable.itemId)
      .having(sql`count(*) > 1`),
  );

  return database
    .with(revised)
    .select({
      gameVersion: itemSnapshotTable.gameVersion,
      itemId: itemSnapshotTable.itemId,
      snapshotId: itemSnapshotTable.id,
      name: itemSnapshotTable.name,
      icon: itemSnapshotTable.icon,
      lvl: itemSnapshotTable.lvl,
      stat: itemSnapshotTable.statRaw,
      firstLootedAt: sql<Date>`min(${lootTable.createdAt})`.mapWith(
        (value: string | Date) => new Date(value),
      ),
      lastLootedAt: sql<Date>`max(${lootTable.createdAt})`.mapWith(
        (value: string | Date) => new Date(value),
      ),
    })
    .from(itemSnapshotTable)
    .innerJoin(
      revised,
      and(
        eq(revised.gameVersion, itemSnapshotTable.gameVersion),
        eq(revised.itemId, itemSnapshotTable.itemId),
      ),
    )
    .innerJoin(
      lootItemTable,
      eq(lootItemTable.itemSnapshotId, itemSnapshotTable.id),
    )
    .innerJoin(lootTable, eq(lootTable.id, lootItemTable.lootId))
    .groupBy(itemSnapshotTable.id);
};

/** One revision of an item and when Lootlog saw it looted. */
export type LootedItemRevision = {
  readonly gameVersion: string;
  readonly itemId: number;
  readonly snapshotId: number;
  readonly name: string;
  readonly icon: string;
  readonly lvl: number | null;
  readonly stat: string;
  readonly firstLootedAt: Date;
  readonly lastLootedAt: Date;
};

const warsawDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar day in Poland, as `YYYY-MM-DD`. */
const toWarsawDay = (instant: Date) => warsawDay.format(instant);

const statEntries = (stat: string) =>
  new Map(
    stat
      .split(";")
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf("=");

        return separator === -1
          ? [entry, ""]
          : [entry.slice(0, separator), entry.slice(separator + 1)];
      }),
  );

/**
 * The stats without `etiquette`, the events an item was last available
 * during. The game writes it onto an event item when the event ends and adds
 * a year each time it returns, which leaves the item itself as it was.
 */
const withoutEvents = (stat: string) =>
  stat
    .split(";")
    .filter((entry) => !entry.startsWith("etiquette="))
    .join(";");

/**
 * Revisions that differ only in their events as one revision, looted from
 * the first loot of any of them to the last.
 */
const mergeEventRevisions = (
  revisions: ReadonlyArray<LootedItemRevision>,
): LootedItemRevision[] =>
  Object.values(
    groupBy(
      revisions.map((revision) => ({
        ...revision,
        stat: withoutEvents(revision.stat),
      })),
      ({ name, icon, lvl, stat }) => JSON.stringify([name, icon, lvl, stat]),
    ),
  ).flatMap((same) => {
    const first = minBy(same, ({ firstLootedAt }) => firstLootedAt.getTime());
    const last = maxBy(same, ({ lastLootedAt }) => lastLootedAt.getTime());

    return first && last ? [{ ...first, lastLootedAt: last.lastLootedAt }] : [];
  });

/** The stat keys, and `name` or `icon`, that differ between two revisions. */
const changedFields = (
  before: LootedItemRevision,
  after: LootedItemRevision,
) => {
  const previous = statEntries(before.stat);
  const next = statEntries(after.stat);

  return [
    ...(before.name === after.name ? [] : ["name"]),
    ...(before.icon === after.icon ? [] : ["icon"]),
    ...[...new Set([...previous.keys(), ...next.keys()])]
      .filter((key) => previous.get(key) !== next.get(key))
      .sort(),
  ];
};

type Change = {
  readonly before: LootedItemRevision;
  readonly after: LootedItemRevision;
  readonly fields: ReadonlyArray<string>;
  /** The game changed the item after this, when the old revision was looted last. */
  readonly changedAfter: Date;
  /** ...and before this, when the new one was looted first. */
  readonly changedBy: Date;
};

/**
 * The changes between consecutive revisions, or none when the revisions
 * overlap: a revision still looted after the next one appeared is not an
 * older version but a variant, as items whose stats follow something other
 * than their level have, so no order of them is a history.
 */
const consecutiveChanges = (
  revisions: ReadonlyArray<LootedItemRevision>,
): Change[] | null => {
  const ordered = sortBy(revisions, [
    ({ firstLootedAt }) => firstLootedAt.getTime(),
    ({ snapshotId }) => snapshotId,
  ]);

  const changes: Change[] = [];

  for (const [index, after] of ordered.entries()) {
    const before = ordered[index - 1];

    if (!before) continue;

    if (before.lastLootedAt >= after.firstLootedAt) return null;

    const fields = changedFields(before, after);

    if (fields.length > 0) {
      changes.push({
        before,
        after,
        fields,
        changedAfter: before.lastLootedAt,
        changedBy: after.firstLootedAt,
      });
    }
  }

  return changes;
};

/**
 * One game change of an elastic item, seen at several of its levels: every
 * level's window holds the moment, so their overlap does too. Levels whose
 * windows do not overlap saw different changes and stay apart.
 */
const mergeLevelChanges = (changes: ReadonlyArray<Change>): Change[] =>
  Object.values(groupBy(changes, ({ fields }) => fields.join(";"))).flatMap(
    (same) => {
      const changedAfter = maxBy(same, ({ changedAfter }) =>
        changedAfter.getTime(),
      )?.changedAfter;

      const changedBy = minBy(same, ({ changedBy }) =>
        changedBy.getTime(),
      )?.changedBy;

      const highest = maxBy(same, ({ after }) => after.lvl ?? 0);

      return changedAfter && changedBy && highest && changedAfter < changedBy
        ? [{ ...highest, changedAfter, changedBy }]
        : same;
    },
  );

const toRevision = ({ before, after, changedAfter, changedBy }: Change) => ({
  name: after.name,
  icon: after.icon,
  lvl: after.lvl ?? 0,
  stat: after.stat,
  previousName: before.name,
  previousIcon: before.icon,
  previousStat: before.stat,
  changedAfter: toWarsawDay(changedAfter),
  changedBy: toWarsawDay(changedBy),
});

/**
 * Every item with more than one revision, with the changes the game made to
 * it, oldest first; an empty list clears what an earlier run published.
 * Events an item was available during are not a change and are left out. An
 * elastic item's revisions differ by level as well, so only revisions of
 * one level are compared.
 */
export const toItemRevisionHistories = (
  rows: ReadonlyArray<LootedItemRevision>,
) =>
  Object.values(
    groupBy(rows, ({ gameVersion, itemId }) =>
      JSON.stringify([gameVersion, itemId]),
    ),
  ).flatMap((looted) => {
    const revisions = mergeEventRevisions(looted);
    const [first] = revisions;

    if (!first) return [];

    const elastic =
      new Set(revisions.map(({ lvl }) => lvl)).size > MAX_FIXED_LEVELS;

    const perLevel = elastic
      ? Object.values(groupBy(revisions, ({ lvl }) => String(lvl)))
      : [revisions];

    const changes = perLevel.map(consecutiveChanges);

    const history = changes.some((level) => level === null)
      ? []
      : (elastic ? mergeLevelChanges : (all: Change[]) => all)(
          changes.flatMap((level) => level ?? []),
        );

    return [
      {
        gameVersion: first.gameVersion,
        id: first.itemId,
        revisions: sortBy(history, [
          ({ changedBy }) => changedBy.getTime(),
        ]).map(toRevision),
      },
    ];
  });
