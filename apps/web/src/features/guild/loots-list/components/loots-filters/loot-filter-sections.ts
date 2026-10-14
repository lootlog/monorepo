import { Package, Skull, Users, type LucideIcon } from "lucide-react";
import type { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

export type LootFiltersState = ReturnType<typeof useLootFiltersSidebar>;

export type LootFilterSectionKey = "npc" | "item" | "player";

/** The filters panel's groups, in order; the rail lists the same ones. */
export const LOOT_FILTER_SECTIONS: ReadonlyArray<{
  key: LootFilterSectionKey;
  icon: LucideIcon;
  titleKey: string;
}> = [
  { key: "npc", icon: Skull, titleKey: "loots.filtersPanel.npcSection.title" },
  {
    key: "item",
    icon: Package,
    titleKey: "loots.filtersPanel.itemSection.title",
  },
  {
    key: "player",
    icon: Users,
    titleKey: "loots.filtersPanel.playerSection.title",
  },
];

export const getLootFilterSectionState = (
  state: LootFiltersState,
  key: LootFilterSectionKey,
) => {
  switch (key) {
    case "npc":
      return {
        count: state.npcActiveFilterCount,
        clear: state.clearNpcFilters,
      };
    case "item":
      return {
        count: state.itemActiveFilterCount,
        clear: state.clearItemFilters,
      };
    case "player":
      return {
        count: state.playerActiveFilterCount,
        clear: state.clearPlayerFilters,
      };
  }
};
