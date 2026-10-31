import { itemEventLabels, latestItemEvent } from "@lootlog/domain/item-events";
import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";

/** The events an item's stats name, as the game writes them. */
export const itemEvents = (stat: string) =>
  itemEventLabels(
    String(
      parseItemStats(stat).find(({ key }) => key === "etiquette")?.value ?? "",
    ),
  );

/** The latest event an item belongs to; none for an item of no event. */
export const latestEventOf = (stat: string) =>
  latestItemEvent(itemEvents(stat));
