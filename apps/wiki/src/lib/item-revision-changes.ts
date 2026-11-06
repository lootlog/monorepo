import type { CatalogItemRevisionDtoOutput } from "@lootlog/client/search";
import {
  type ItemDisplayValue,
  mapStatsToDisplaySections,
  parseItemStats,
} from "@lootlog/ui/components/item-stat-utils";

export type StatRevision = {
  key: string;
  /** The stat as the item showed it before the change; none when added. */
  before?: ItemDisplayValue;
  /** ...and after it; none when the game removed it. */
  after?: ItemDisplayValue;
};

const displayValues = (stat: string) =>
  new Map(
    mapStatsToDisplaySections(parseItemStats(stat)).flatMap(({ values }) =>
      values.flatMap((value) =>
        value.key === undefined ? [] : [[value.key, value] as const],
      ),
    ),
  );

/**
 * The stats a change gave, took away or altered, as the item shows them:
 * those it kept come first in the new order, then those it lost.
 */
export const findStatRevisions = ({
  previousStat,
  stat,
}: Pick<CatalogItemRevisionDtoOutput, "previousStat" | "stat">) => {
  const before = displayValues(previousStat);
  const after = displayValues(stat);

  const revisions: StatRevision[] = [
    ...[...after].map(([key, value]) => ({
      key,
      before: before.get(key),
      after: value,
    })),
    ...[...before].flatMap(([key, value]) =>
      after.has(key) ? [] : [{ key, before: value }],
    ),
  ];

  return revisions.filter(
    ({ before: previous, after: next }) =>
      JSON.stringify(previous) !== JSON.stringify(next),
  );
};

/** How many names, icons and stats a change altered. */
export const countRevisionChanges = (revision: CatalogItemRevisionDtoOutput) =>
  findStatRevisions(revision).length +
  Number(revision.previousName !== revision.name) +
  Number(revision.previousIcon !== revision.icon);

const dayFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "long",
  timeZone: "UTC",
});

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * When the game made a change, as Lootlog can tell from loots: one day, or
 * the days between the old revision's last loot and the new one's first.
 */
export const formatRevisionDays = ({
  changedAfter,
  changedBy,
}: Pick<CatalogItemRevisionDtoOutput, "changedAfter" | "changedBy">) =>
  changedAfter === changedBy
    ? dayFormat.format(toDate(changedBy))
    : dayFormat.formatRange(toDate(changedAfter), toDate(changedBy));
