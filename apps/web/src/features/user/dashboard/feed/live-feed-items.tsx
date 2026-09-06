import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { ItemRarity } from "@/lib/loots/loot-types";
import { ItemTile } from "@/components/tiles/item-tile";

type LootFeedItem = Extract<
  UserFeedResponseDtoOutput["items"][number],
  { type: "loot" }
>;

export function LiveFeedItems({ item }: { item: LootFeedItem }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t("statistics.feedItems")}>
      {item.items.map((lootItem, index) => (
        <li
          key={`${lootItem.id}:${index}`}
          className="flex min-w-0 items-center gap-1.5 text-xs"
        >
          <ItemTile
            item={{
              ...lootItem,
              stat: lootItem.stat ?? "",
              type: lootItem.type ?? null,
              rarity:
                Object.values(ItemRarity).find(
                  (rarity) => rarity === lootItem.rarity,
                ) ?? ItemRarity.COMMON,
            }}
          />
        </li>
      ))}
      {item.additionalItemsCount > 0 && (
        <li className="self-center text-xs text-muted-foreground">
          {t("statistics.feedMoreItems", {
            count: item.additionalItemsCount,
          })}
        </li>
      )}
    </ul>
  );
}
