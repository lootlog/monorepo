import type { GameVersion } from "@lootlog/schema/game-version";
import { MAX_FIXED_LEVELS } from "@lootlog/domain/elastic-level";
import {
  parseItemStatEntries,
  withoutItemStat,
} from "@lootlog/domain/item-stat";
import { and, eq, sql } from "drizzle-orm";
import { groupBy, maxBy, minBy, sortBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  lootItemTable,
  lootTable,
} from "#src/database/drizzle/loot.schema";

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

export type LootedItemRevision = {
  readonly gameVersion: GameVersion;
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

const toWarsawDay = (instant: Date) => warsawDay.format(instant);

const statEntries = (stat: string) =>
  new Map(parseItemStatEntries(stat).map(({ key, value }) => [key, value]));

const withoutEvents = (stat: string) => withoutItemStat(stat, "etiquette");

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
  readonly changedAfter: Date;
  readonly changedBy: Date;
};

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
