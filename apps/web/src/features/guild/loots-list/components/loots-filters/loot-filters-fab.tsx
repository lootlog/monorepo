import { Button } from "@lootlog/ui/components/button";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LootFilterCount } from "./loot-filter-count";

type LootFiltersFabProps = {
  activeFilterCount: number;
  onOpenFilters: () => void;
};

/** Phones open the loot filters from a floating button within thumb reach. */
export const LootFiltersFab = ({
  activeFilterCount,
  onOpenFilters,
}: LootFiltersFabProps) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      onClick={onOpenFilters}
      aria-label={
        activeFilterCount > 0
          ? `${t("loots.header.filtersButton")}. ${t("loots.filtersPanel.activeCount", { count: activeFilterCount })}`
          : t("loots.header.filtersButton")
      }
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg shadow-black/40 [&_svg:not([class*='size-'])]:size-6"
    >
      <SlidersHorizontal aria-hidden="true" />
      <LootFilterCount count={activeFilterCount} variant="corner" />
    </Button>
  );
};
