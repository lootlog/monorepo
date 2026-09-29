/* eslint-disable react-doctor/no-array-index-as-key -- Items belong to immutable loot events and never reorder within their row. Identical drops may share catalog IDs and HIDs, so the occurrence index disambiguates them. */
import { useTranslation } from "react-i18next";
import { ItemTile } from "@/components/tiles/item-tile";
import { LiveFeedItems } from "./live-feed-items";
import type { FeedLoot } from "./live-feed-state";

export function LiveFeedEventLoot({ loots }: { loots: FeedLoot[] }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      {loots.map((loot) =>
        loot.summary ? (
          <ul
            key={loot.lootId}
            className="flex flex-wrap items-center gap-1"
            aria-label={t("statistics.feedItems")}
          >
            {loot.summary.items.map((item, index) => (
              <li key={`${item.hid}:${index}`} className="flex">
                <ItemTile item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <LiveFeedItems key={loot.lootId} item={loot} />
        ),
      )}
    </div>
  );
}
