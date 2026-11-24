import { maxBy, orderBy } from "es-toolkit";
import {
  itemEventEditionEnd,
  itemEventLabels,
  itemEventSlug,
} from "@lootlog/domain/item-events";
import { itemStatValue } from "@lootlog/domain/item-stat";
import type { DropSource } from "#src/items/item-drops";
import type { CatalogEventsResponseDto_Output } from "#src/http-api/contracts/catalog/schemas";

type EventItem = { stat: string; droppedBy?: DropSource[] } | undefined;

const EVENT_YEAR = /\b(\d{4})\b/;

export const toCatalogEvents = (
  counts: ReadonlyArray<readonly [slug: string, itemCount: number]>,
  highestLevelItems: readonly EventItem[],
): CatalogEventsResponseDto_Output["events"] => {
  const events = counts.flatMap(([slug, itemCount], index) => {
    const item = highestLevelItems[index];

    const name = itemEventLabels(
      itemStatValue(item?.stat ?? "", "etiquette") ?? "",
    ).find((label) => itemEventSlug(label) === slug);

    if (!name) return [];

    const boss = maxBy(item?.droppedBy ?? [], ({ lvl }) => lvl ?? 0);
    const year = EVENT_YEAR.exec(name)?.[1];

    return [
      {
        slug,
        name,
        year: year === undefined ? null : Number(year),
        itemCount,
        boss: boss ? { name: boss.name, icon: boss.icon } : null,
      },
    ];
  });

  return orderBy(
    events,
    [({ slug }) => itemEventEditionEnd(slug) ?? "", ({ name }) => name],
    ["desc", "asc"],
  );
};
