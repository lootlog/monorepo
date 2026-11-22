import type { UserLootStatsResponseDtoOutputLegendsItem } from "@lootlog/client/main";
import { ItemTile } from "@/components/tiles/item-tile";

export function StatisticsLegendItem({
  legend,
}: {
  legend: UserLootStatsResponseDtoOutputLegendsItem;
}) {
  return (
    <span className="flex w-8 shrink-0 items-center justify-center">
      <ItemTile
        item={{
          name: legend.name,
          icon: legend.icon,
          rarity: "LEGENDARY",
          stat: legend.stat,
          type: legend.type ?? "",
        }}
      />
    </span>
  );
}
