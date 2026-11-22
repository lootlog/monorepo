import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import type { CatalogItemRevisionDtoOutput } from "@lootlog/client/catalog";
import {
  type ItemDisplayValue,
  mapStatsToDisplaySections,
} from "@lootlog/ui/components/item-stat-utils";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

type StatRevision = {
  key: string;
  before?: ItemDisplayValue;
  after?: ItemDisplayValue;
};

const displayValues = (stat: string) =>
  new Map(
    mapStatsToDisplaySections(parseItemStatEntries(stat)).flatMap(
      ({ values }) =>
        values.flatMap((value) =>
          value.key === undefined ? [] : [[value.key, value] as const],
        ),
    ),
  );

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

export const countRevisionChanges = (revision: CatalogItemRevisionDtoOutput) =>
  findStatRevisions(revision).length +
  Number(revision.previousName !== revision.name) +
  Number(revision.previousIcon !== revision.icon);

const dayFormat = new Intl.DateTimeFormat(PRODUCT_LOCALE, {
  dateStyle: "long",
  timeZone: "UTC",
});

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);

export const formatRevisionDays = ({
  changedAfter,
  changedBy,
}: Pick<CatalogItemRevisionDtoOutput, "changedAfter" | "changedBy">) =>
  changedAfter === changedBy
    ? dayFormat.format(toDate(changedBy))
    : dayFormat.formatRange(toDate(changedAfter), toDate(changedBy));
