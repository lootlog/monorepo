/* eslint-disable react-doctor/no-array-index-as-key -- Items belong to immutable loot events and never reorder within their row. Identical drops may share catalog IDs and HIDs, so the occurrence index disambiguates them. */
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { useTranslation } from "react-i18next";
import { ItemTile } from "@/components/tiles/item-tile";
import type { FeedLoot } from "./live-feed-state";

/** Items past this many collapse into a count, so a big drop keeps one row. */
const VISIBLE_ITEMS = 4;

export function LiveFeedEventLoot({ loots }: { loots: FeedLoot[] }) {
  const { t } = useTranslation();

  const items = loots.flatMap((loot) =>
    (loot.summary?.items ?? loot.items).map((item) => ({
      ...item,
      stat: item.stat ?? "",
      type: item.type ?? null,
      rarity: resolveItemRarity(item.rarity),
    })),
  );

  const hidden =
    Math.max(0, items.length - VISIBLE_ITEMS) +
    loots.reduce(
      (sum, loot) => sum + (loot.summary ? 0 : loot.additionalItemsCount),
      0,
    );

  return (
    <ul
      className="flex shrink-0 items-center gap-1"
      aria-label={t("statistics.feedItems")}
    >
      {items.slice(0, VISIBLE_ITEMS).map((item, index) => (
        <li key={`${item.id}:${index}`} className="flex">
          <ItemTile item={item} />
        </li>
      ))}
      {hidden > 0 && (
        <li className="px-1 text-xs font-medium tabular-nums text-muted-foreground">
          {t("statistics.feedMoreItems", { count: hidden })}
        </li>
      )}
    </ul>
  );
}
